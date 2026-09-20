import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookie } from "cookie";
import { and, asc, count, desc, eq, or, sum } from "drizzle-orm";
import { z } from "zod";
import { announcements, billingPeriods, billingTypes, campaigns, donations, eventReminderRules, eventRegistrations, events, files, forumPosts, forumReports, forumTopics, fundUsages, householdMembers, households, invoices, organizationMembers, organizations, payments, paymentStatusHistory, rtUnits, rwUnits, users } from "../drizzle/schema";
import { getDb, getOrganizationSummary, getUserOrganizations, logAudit, searchOrganizationResidents } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createPrivateSignedUrl, uploadPrivateObject } from "./supabaseStorage";
import { createHeartbeatJob } from "./_core/heartbeat";
import { TRPCError } from "@trpc/server";
import { registerUser, loginUser } from "./auth";
import {
  requireMembership,
  requirePermission,
  requireScopeAccess,
  requireScopeManage,
  getMembership,
  getRtRwId,
  getRwRtIds,
  isHouseholdInScope,
  type MembershipContext,
  type ResourceScope,
} from "./_core/authorize";
import { P, type Permission, type ScopeType, type CommunityRole } from "./_core/permissions";
import { emitForumEvent } from "./realtime";

const organizationIdInput = z.object({ organizationId: z.string().min(1).max(80) });
const scopeInput = z.object({
  scopeType: z.enum(["organization", "rw", "rt"]).default("organization"),
  scopeId: z.string().nullable().default(null),
});

// Legacy compatibility helpers — delegate to new authorize module
async function requireOrganizationAccess(userId: number, organizationId: string) {
  return requireMembership(userId, organizationId);
}

async function requireOrganizationRole(userId: number, organizationId: string, allowedRoles: string[]) {
  const membership = await requireMembership(userId, organizationId);
  if (!allowedRoles.includes(membership.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Peran Anda tidak dapat melakukan tindakan ini" });
  }
  return membership;
}

/** Helper: resolve scope from rw/rt references in a resource */
function resourceScope(orgId: string, scopeType?: string | null, scopeId?: string | null): ResourceScope {
  if (scopeType && scopeType !== "organization" && scopeId) {
    return { type: scopeType as ScopeType, id: scopeId };
  }
  return { type: "organization", id: orgId };
}

export const appRouter = router({
  system: systemRouter,
  publicContent: router({
    organizationBySlug: publicProcedure.input(z.object({ slug: z.string().trim().min(1).max(120) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select({ organization: organizations }).from(organizations).where(and(eq(organizations.slug, input.slug), eq(organizations.status, "active"))).limit(1);
      return result[0]?.organization ?? null;
    }),
    eventBySlug: publicProcedure.input(z.object({ organizationSlug: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(140) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select({ event: events, organization: organizations }).from(events).innerJoin(organizations, eq(organizations.id, events.organizationId)).where(and(eq(organizations.slug, input.organizationSlug), eq(events.slug, input.slug), eq(events.status, "published"), eq(organizations.status, "active"))).limit(1);
      return result[0] ?? null;
    }),
    campaignBySlug: publicProcedure.input(z.object({ organizationSlug: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(140) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select({ campaign: campaigns, organization: organizations }).from(campaigns).innerJoin(organizations, eq(organizations.id, campaigns.organizationId)).where(and(eq(organizations.slug, input.organizationSlug), eq(campaigns.slug, input.slug), eq(campaigns.status, "published"), eq(organizations.status, "active"))).limit(1);
      return result[0] ?? null;
    }),
    listOrganizations: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(organizations).where(eq(organizations.status, "active")).orderBy(asc(organizations.name));
    }),
    listRwUnits: publicProcedure
      .input(z.object({ organizationId: z.string().min(1).max(80) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const rwRows = await db.select().from(rwUnits).where(eq(rwUnits.organizationId, input.organizationId)).orderBy(asc(rwUnits.code));
        // Also fetch RTs for each RW
        const result = await Promise.all(rwRows.map(async rw => {
          const rts = await db.select().from(rtUnits).where(eq(rtUnits.rwId, rw.id)).orderBy(asc(rtUnits.code));
          return { ...rw, rts };
        }));
        return result;
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure
      .input(z.object({
        name: z.string().trim().min(2).max(100),
        email: z.string().email().max(200),
        password: z.string().min(6).max(100),
        role: z.enum(["organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"]).default("resident"),
        organizationIds: z.array(z.string().min(1).max(80)).default([]),
        createOrganization: z.object({ name: z.string().min(1).max(120), slug: z.string().min(1).max(120) }).optional(),
        createRw: z.object({ name: z.string().min(1), code: z.string().min(1).max(10), organizationId: z.string().min(1) }).optional(),
        createRt: z.object({ name: z.string().min(1), code: z.string().min(1).max(10), rwId: z.string().min(1) }).optional(),
        // For resident joining a specific RT
        joinRtId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { user, token } = await registerUser({ name: input.name, email: input.email, password: input.password, role: input.role });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });

        let finalOrgIds = [...input.organizationIds];
        // Track scope for each org membership
        const membershipScopes: Record<string, { scopeType: string; scopeId: string | null }> = {};

        // If village admin: create new organization (desa/kelurahan) and auto-join
        if (input.createOrganization) {
          // Check slug uniqueness
          const existingOrg = await db.select().from(organizations).where(eq(organizations.slug, input.createOrganization.slug)).limit(1);
          if (existingOrg[0]) throw new TRPCError({ code: "CONFLICT", message: "Slug desa/kelurahan sudah digunakan" });
          const [newOrg] = await db.insert(organizations).values({
            name: input.createOrganization.name,
            slug: input.createOrganization.slug,
          }).returning();
          if (newOrg) {
            finalOrgIds.push(newOrg.id);
            membershipScopes[newOrg.id] = { scopeType: "organization", scopeId: null };
            await logAudit({ actorId: user.id, action: "create", resource: "organization", resourceId: newOrg.id });
          }
        }

        // If RW admin: create new RW and auto-join the organization
        if (input.createRw) {
          const org = await db.select().from(organizations).where(eq(organizations.id, input.createRw.organizationId)).limit(1);
          if (!org[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Desa/kelurahan tidak ditemukan" });
          const [newRw] = await db.insert(rwUnits).values({
            organizationId: input.createRw.organizationId,
            name: input.createRw.name,
            code: input.createRw.code,
          }).returning();
          if (!finalOrgIds.includes(input.createRw.organizationId)) {
            finalOrgIds.push(input.createRw.organizationId);
          }
          membershipScopes[input.createRw.organizationId] = { scopeType: "rw", scopeId: newRw?.id || null };
          await logAudit({ actorId: user.id, action: "create", resource: "rw_unit", resourceId: newRw?.id, metadata: { organizationId: input.createRw.organizationId } });
        }

        // If RT admin: create new RT and auto-join the parent RW's organization
        if (input.createRt) {
          const rw = await db.select().from(rwUnits).where(eq(rwUnits.id, input.createRt.rwId)).limit(1);
          if (!rw[0]) throw new TRPCError({ code: "NOT_FOUND", message: "RW tidak ditemukan" });
          const [newRt] = await db.insert(rtUnits).values({
            rwId: input.createRt.rwId,
            name: input.createRt.name,
            code: input.createRt.code,
          }).returning();
          if (!finalOrgIds.includes(rw[0].organizationId)) {
            finalOrgIds.push(rw[0].organizationId);
          }
          membershipScopes[rw[0].organizationId] = { scopeType: "rt", scopeId: newRt?.id || null };
          await logAudit({ actorId: user.id, action: "create", resource: "rt_unit", resourceId: newRt?.id, metadata: { rwId: input.createRt.rwId } });
        }

        // Add user to organizations with proper scope
        if (finalOrgIds.length > 0) {
          await db.insert(organizationMembers).values(
            finalOrgIds.map(orgId => {
              const scope = membershipScopes[orgId];
              // Resident joining via joinRtId: scopeType=rt, scopeId=joinRtId
              const isResidentJoin = input.role === "resident" && input.joinRtId && !scope;
              return {
                organizationId: orgId,
                userId: user.id,
                role: input.role === "resident" ? "resident" : input.role as CommunityRole,
                scopeType: scope?.scopeType || (isResidentJoin ? "rt" : "organization") as any,
                scopeId: scope?.scopeId || (isResidentJoin ? input.joinRtId : null),
                status: "active" as const,
              };
            })
          ).onConflictDoNothing();
        }

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { id: user.id, name: user.name, email: user.email, role: input.role };
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().email().max(200), password: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const { user, token } = await loginUser(input);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  community: router({
    organizations: protectedProcedure.query(({ ctx }) => getUserOrganizations(ctx.user.id)),
    summary: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      return getOrganizationSummary(input.organizationId);
    }),
    residents: protectedProcedure.input(organizationIdInput.extend({ query: z.string().trim().max(100).default(""), limit: z.number().int().min(1).max(100).default(25), offset: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      return searchOrganizationResidents(input.organizationId, input.query, input.limit, input.offset);
    }),
    // --- Join Request: warga mengajukan join ke RT/RW baru ---
    joinRequest: protectedProcedure
      .input(z.object({ organizationId: z.string().min(1).max(80) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
        // Cek apakah sudah ada di organisasi
        const existing = await db.select().from(organizationMembers).where(
          and(eq(organizationMembers.organizationId, input.organizationId), eq(organizationMembers.userId, ctx.user.id))
        ).limit(1);
        if (existing[0]) {
          if (existing[0].status === "active") throw new TRPCError({ code: "CONFLICT", message: "Anda sudah menjadi anggota wilayah ini" });
          if (existing[0].status === "pending") throw new TRPCError({ code: "CONFLICT", message: "Pengajuan join sedang diproses" });
        }
        // Cek apakah organisasi ada
        const org = await db.select().from(organizations).where(eq(organizations.id, input.organizationId)).limit(1);
        if (!org[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Wilayah tidak ditemukan" });
        // Upsert: buat atau update status ke pending — scope = organization (warga biasa)
        await db.insert(organizationMembers).values({
          organizationId: input.organizationId,
          userId: ctx.user.id,
          role: "resident",
          scopeType: "organization",
          scopeId: null,
          status: "pending",
        }).onConflictDoUpdate({
          target: [organizationMembers.organizationId, organizationMembers.userId],
          set: { status: "pending", updatedAt: new Date() },
        });
        return { success: true } as const;
      }),
    // --- List pending join requests (admin only, scoped) ---
    pendingJoinRequests: protectedProcedure
      .input(organizationIdInput)
      .query(async ({ ctx, input }) => {
        await requirePermission(ctx.user.id, input.organizationId, P.JOIN_REQUEST_VIEW);
        const db = await getDb();
        if (!db) return [];
        return db.select({
          membership: organizationMembers,
          user: users,
        }).from(organizationMembers)
          .innerJoin(users, eq(users.id, organizationMembers.userId))
          .where(and(
            eq(organizationMembers.organizationId, input.organizationId),
            eq(organizationMembers.status, "pending"),
          ))
          .orderBy(desc(organizationMembers.createdAt));
      }),
    // --- Approve / Reject join request ---
    reviewJoinRequest: protectedProcedure
      .input(z.object({
        organizationId: z.string().min(1).max(80),
        userId: z.number().int().positive(),
        action: z.enum(["approve", "reject"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await requirePermission(ctx.user.id, input.organizationId, P.JOIN_REQUEST_APPROVE);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
        const target = await db.select().from(organizationMembers).where(
          and(
            eq(organizationMembers.organizationId, input.organizationId),
            eq(organizationMembers.userId, input.userId),
            eq(organizationMembers.status, "pending"),
          )
        ).limit(1);
        if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Pengajuan join tidak ditemukan" });
        if (input.action === "approve") {
          await db.update(organizationMembers).set({ status: "active", updatedAt: new Date() }).where(
            and(eq(organizationMembers.organizationId, input.organizationId), eq(organizationMembers.userId, input.userId))
          );
        } else {
          await db.delete(organizationMembers).where(
            and(eq(organizationMembers.organizationId, input.organizationId), eq(organizationMembers.userId, input.userId))
          );
        }
        await logAudit({ actorId: ctx.user.id, action: `join_request_${input.action}`, resource: "organization_member", metadata: { organizationId: input.organizationId, targetUserId: input.userId } });
        return { success: true } as const;
      }),
  }),
  households: router({
    list: protectedProcedure.input(organizationIdInput.extend({ limit: z.number().int().min(1).max(100).default(25), offset: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select({ household: households, rt: rtUnits, rw: rwUnits }).from(households).innerJoin(rtUnits, eq(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId)).where(eq(rwUnits.organizationId, input.organizationId)).orderBy(asc(households.createdAt)).limit(input.limit).offset(input.offset);
    }),
    listMembers: protectedProcedure.input(z.object({ organizationId: z.string().min(1), householdId: z.string().min(1) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select({ member: householdMembers, user: users }).from(householdMembers).innerJoin(users, eq(users.id, householdMembers.userId)).innerJoin(households, eq(households.id, householdMembers.householdId)).innerJoin(rtUnits, eq(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId)).where(and(eq(householdMembers.householdId, input.householdId), eq(rwUnits.organizationId, input.organizationId))).orderBy(desc(householdMembers.isHead), asc(users.name));
    }),
    addMember: protectedProcedure.input(z.object({ organizationId: z.string().min(1), householdId: z.string().min(1), userId: z.number().int().positive(), relationship: z.string().trim().min(2).max(60), isHead: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const membership = await requirePermission(ctx.user.id, input.organizationId, P.HOUSEHOLD_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const household = await db.select({ household: households }).from(households).innerJoin(rtUnits, eq(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId)).where(and(eq(households.id, input.householdId), eq(rwUnits.organizationId, input.organizationId))).limit(1);
      if (!household[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Rumah tangga tidak ditemukan" });
      // Scope check: verify household is within membership scope
      const householdRtId = household[0].household.rtId;
      if (!await isHouseholdInScope(membership, householdRtId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Rumah tangga berada di luar wilayah Anda" });
      }
      const [member] = await db.insert(householdMembers).values({ householdId: input.householdId, userId: input.userId, relationship: input.relationship, isHead: input.isHead }).onConflictDoUpdate({ target: [householdMembers.householdId, householdMembers.userId], set: { relationship: input.relationship, isHead: input.isHead, updatedAt: new Date() } }).returning();
      if (member) await logAudit({ actorId: ctx.user.id, action: "household_member_upsert", resource: "household", resourceId: input.householdId, metadata: { organizationId: input.organizationId, userId: input.userId } });
      return member;
    }),
  }),
  billing: router({
    listTypes: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(billingTypes).where(eq(billingTypes.organizationId, input.organizationId)).orderBy(asc(billingTypes.name));
    }),
    listPeriods: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select({ period: billingPeriods, type: billingTypes }).from(billingPeriods).innerJoin(billingTypes, eq(billingTypes.id, billingPeriods.billingTypeId)).where(eq(billingTypes.organizationId, input.organizationId)).orderBy(desc(billingPeriods.periodKey)).limit(30);
    }),
    createType: protectedProcedure.input(organizationIdInput.extend({ name: z.string().trim().min(2).max(80), code: z.string().trim().min(2).max(30).regex(/^[a-z0-9-]+$/), description: z.string().trim().max(240).optional(), unit: z.string().trim().min(2).max(40).default("household"), defaultAmount: z.number().int().min(0).max(100000000), scopeType: z.enum(["organization", "rw", "rt"]).default("organization"), scopeId: z.string().nullable().default(null) })).mutation(async ({ ctx, input }) => {
      const membership = await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [created] = await db.insert(billingTypes).values({ organizationId: input.organizationId, name: input.name, code: input.code, description: input.description, unit: input.unit, defaultAmount: input.defaultAmount, scopeType: input.scopeType, scopeId: input.scopeId }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "billing_type", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    createPeriod: protectedProcedure.input(z.object({ organizationId: z.string().min(1), billingTypeId: z.string().min(1), periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), dueAt: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const typeResult = await db.select().from(billingTypes).where(and(eq(billingTypes.id, input.billingTypeId), eq(billingTypes.organizationId, input.organizationId), eq(billingTypes.active, true))).limit(1);
      if (!typeResult[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Kategori aktif tidak ditemukan" });
      const [period] = await db.insert(billingPeriods).values({ billingTypeId: input.billingTypeId, periodKey: input.periodKey, dueAt: new Date(input.dueAt), status: "draft" }).onConflictDoUpdate({ target: [billingPeriods.billingTypeId, billingPeriods.periodKey], set: { dueAt: new Date(input.dueAt), updatedAt: new Date() } }).returning();
      return period;
    }),
    issueInvoices: protectedProcedure.input(z.object({ organizationId: z.string().min(1), billingPeriodId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const periodResult = await db.select({ period: billingPeriods, type: billingTypes }).from(billingPeriods).innerJoin(billingTypes, eq(billingTypes.id, billingPeriods.billingTypeId)).where(and(eq(billingPeriods.id, input.billingPeriodId), eq(billingTypes.organizationId, input.organizationId))).limit(1);
      const period = periodResult[0];
      if (!period) throw new TRPCError({ code: "NOT_FOUND", message: "Periode tagihan tidak ditemukan" });
      const homes = await db.select({ id: households.id }).from(households).innerJoin(rtUnits, eq(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId)).where(and(eq(rwUnits.organizationId, input.organizationId), eq(households.status, "active")));
      if (homes.length) await db.insert(invoices).values(homes.map(home => ({ householdId: home.id, billingPeriodId: input.billingPeriodId, amount: period.type.defaultAmount, status: "unpaid" as const }))).onConflictDoNothing({ target: [invoices.householdId, invoices.billingPeriodId] });
      await db.update(billingPeriods).set({ status: "issued", updatedAt: new Date() }).where(eq(billingPeriods.id, input.billingPeriodId));
      await logAudit({ actorId: ctx.user.id, action: "issue_invoices", resource: "billing_period", resourceId: input.billingPeriodId, metadata: { organizationId: input.organizationId, count: homes.length } });
      return { success: true, count: homes.length } as const;
    }),
    updateType: protectedProcedure.input(z.object({ organizationId: z.string().min(1), typeId: z.string().min(1), name: z.string().trim().min(2).max(80), description: z.string().trim().max(240).optional(), defaultAmount: z.number().int().min(0).max(100000000), active: z.boolean() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.update(billingTypes).set({ name: input.name, description: input.description, defaultAmount: input.defaultAmount, active: input.active, updatedAt: new Date() }).where(and(eq(billingTypes.id, input.typeId), eq(billingTypes.organizationId, input.organizationId))).returning();
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Kategori tagihan tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "update", resource: "billing_type", resourceId: input.typeId, metadata: { organizationId: input.organizationId } });
      return result[0];
    }),
    deleteType: protectedProcedure.input(z.object({ organizationId: z.string().min(1), typeId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.update(billingTypes).set({ active: false, updatedAt: new Date() }).where(and(eq(billingTypes.id, input.typeId), eq(billingTypes.organizationId, input.organizationId))).returning({ id: billingTypes.id });
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Kategori tagihan tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "archive", resource: "billing_type", resourceId: input.typeId, metadata: { organizationId: input.organizationId } });
      return { success: true } as const;
    }),
    myInvoices: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: invoices.id, amount: invoices.amount, status: invoices.status, periodKey: billingPeriods.periodKey, typeName: billingTypes.name }).from(invoices).innerJoin(billingPeriods, eq(billingPeriods.id, invoices.billingPeriodId)).innerJoin(billingTypes, eq(billingTypes.id, billingPeriods.billingTypeId)).innerJoin(households, eq(households.id, invoices.householdId)).innerJoin(householdMembers, eq(householdMembers.householdId, households.id)).where(and(eq(householdMembers.userId, ctx.user.id), eq(invoices.status, "unpaid"))).orderBy(desc(invoices.createdAt));
    }),
    myPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ history: paymentStatusHistory, invoice: invoices, payment: payments, typeName: billingTypes.name, periodKey: billingPeriods.periodKey }).from(paymentStatusHistory).innerJoin(payments, eq(payments.id, paymentStatusHistory.paymentId)).innerJoin(invoices, eq(invoices.id, paymentStatusHistory.invoiceId)).innerJoin(billingPeriods, eq(billingPeriods.id, invoices.billingPeriodId)).innerJoin(billingTypes, eq(billingTypes.id, billingPeriods.billingTypeId)).innerJoin(householdMembers, eq(householdMembers.householdId, invoices.householdId)).where(eq(householdMembers.userId, ctx.user.id)).orderBy(desc(paymentStatusHistory.createdAt)).limit(20);
    }),
    submitPayment: protectedProcedure.input(z.object({ invoiceId: z.string().min(1), amount: z.number().int().positive(), filename: z.string().trim().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]), contentBase64: z.string().min(10).max(7000000), note: z.string().trim().max(240).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const ownership = await db.select({ invoice: invoices, household: households, rt: rtUnits, rw: rwUnits, membership: householdMembers }).from(invoices).innerJoin(households, eq(households.id, invoices.householdId)).innerJoin(rtUnits, eq(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId)).innerJoin(householdMembers, eq(householdMembers.householdId, households.id)).where(and(eq(invoices.id, input.invoiceId), eq(householdMembers.userId, ctx.user.id))).limit(1);
      const target = ownership[0];
      if (!target) throw new TRPCError({ code: "FORBIDDEN", message: "Tagihan tidak tersedia untuk akun ini" });
      if (input.amount !== target.invoice.amount) throw new TRPCError({ code: "BAD_REQUEST", message: "Nominal pembayaran tidak sesuai tagihan" });
      const buffer = Buffer.from(input.contentBase64, "base64");
      if (buffer.byteLength > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Ukuran bukti pembayaran maksimal 5 MB" });
      const path = `payments/${target.rw.organizationId}/${ctx.user.id}/${target.invoice.id}-${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      await uploadPrivateObject({ bucket: "smart-warga-private", path, body: buffer, contentType: input.mimeType });
      const [file] = await db.insert(files).values({ ownerId: ctx.user.id, bucket: "smart-warga-private", path, filename: input.filename, mimeType: input.mimeType, size: buffer.byteLength, visibility: "private" }).returning();
      const [payment] = await db.insert(payments).values({ invoiceId: target.invoice.id, submittedBy: ctx.user.id, amount: input.amount, proofFileId: file?.id, note: input.note, status: "submitted" }).returning();
      await db.update(invoices).set({ status: "submitted", updatedAt: new Date() }).where(eq(invoices.id, target.invoice.id));
      if (payment) { await db.insert(paymentStatusHistory).values({ paymentId: payment.id, invoiceId: target.invoice.id, status: "submitted", actorId: ctx.user.id, note: input.note }); await logAudit({ actorId: ctx.user.id, action: "submit", resource: "payment", resourceId: payment.id, metadata: { invoiceId: target.invoice.id } }); }
      return payment;
    }),
    listPending: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      const membership = await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) return [];
      let pending = await db.select({ payment: payments, invoice: invoices, household: households, rt: rtUnits, rw: rwUnits }).from(payments).innerJoin(invoices, eq(invoices.id, payments.invoiceId)).innerJoin(households, eq(households.id, invoices.householdId)).innerJoin(rtUnits, eq(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId)).where(and(eq(payments.status, "submitted"), eq(rwUnits.organizationId, input.organizationId))).orderBy(desc(payments.createdAt));
      // Scope filter: if RW/RT admin, only show payments from their scope
      if (membership.scopeType === "rw" && membership.scopeId) {
        pending = pending.filter(item => item.rw.id === membership.scopeId);
      } else if (membership.scopeType === "rt" && membership.scopeId) {
        pending = pending.filter(item => item.rt.id === membership.scopeId);
      }
      return Promise.all(pending.map(async item => ({ ...item, history: await db.select().from(paymentStatusHistory).where(eq(paymentStatusHistory.paymentId, item.payment.id)).orderBy(desc(paymentStatusHistory.createdAt)) })));
    }),
    verifyPayment: protectedProcedure.input(z.object({ organizationId: z.string().min(1), paymentId: z.string().min(1), status: z.enum(["verified", "rejected"]), note: z.string().trim().max(240).optional() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const paymentResult = await db.select({ payment: payments, invoice: invoices, household: households, rt: rtUnits, rw: rwUnits }).from(payments).innerJoin(invoices, eq(invoices.id, payments.invoiceId)).innerJoin(households, eq(households.id, invoices.householdId)).innerJoin(rtUnits, eq(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId)).where(and(eq(payments.id, input.paymentId), eq(rwUnits.organizationId, input.organizationId))).limit(1);
      const target = paymentResult[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Pembayaran tidak ditemukan" });
      await db.update(payments).set({ status: input.status, verifiedBy: ctx.user.id, verifiedAt: new Date(), note: input.note, updatedAt: new Date() }).where(eq(payments.id, input.paymentId));
      await db.update(invoices).set({ status: input.status === "verified" ? "verified" : "rejected", updatedAt: new Date() }).where(eq(invoices.id, target.invoice.id));
      await db.insert(paymentStatusHistory).values({ paymentId: input.paymentId, invoiceId: target.invoice.id, status: input.status, actorId: ctx.user.id, note: input.note });
      await logAudit({ actorId: ctx.user.id, action: input.status, resource: "payment", resourceId: input.paymentId, metadata: { organizationId: input.organizationId, invoiceId: target.invoice.id, note: input.note } });
      return { success: true, status: input.status } as const;
    }),
  }),
  events: router({
    list: protectedProcedure.input(organizationIdInput.extend({ limit: z.number().int().min(1).max(100).default(20), offset: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      const access = await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      const canManage = ["platform_admin", "organization_admin", "rw_admin", "rt_admin"].includes(access.role);
      const scope = canManage ? eq(events.organizationId, input.organizationId) : and(eq(events.organizationId, input.organizationId), eq(events.status, "published"));
      return db.select({ event: events, attendeeCount: count(eventRegistrations.userId) }).from(events).leftJoin(eventRegistrations, and(eq(eventRegistrations.eventId, events.id), eq(eventRegistrations.status, "registered"))).where(scope).groupBy(events.id).orderBy(asc(events.startsAt)).limit(input.limit).offset(input.offset);
    }),
    create: protectedProcedure.input(organizationIdInput.extend({ title: z.string().trim().min(3).max(120), slug: z.string().trim().min(3).max(140).regex(/^[a-z0-9-]+$/), description: z.string().trim().max(1000).optional(), location: z.string().trim().max(180).optional(), startsAt: z.number().int().positive(), endsAt: z.number().int().positive().optional(), capacity: z.number().int().positive().max(10000).optional(), scopeType: z.enum(["organization", "rw", "rt"]).default("organization"), scopeId: z.string().nullable().default(null) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.EVENT_CREATE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [created] = await db.insert(events).values({ organizationId: input.organizationId, title: input.title, slug: input.slug, description: input.description, location: input.location, startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : undefined, capacity: input.capacity, status: "draft", scopeType: input.scopeType, scopeId: input.scopeId }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "event", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    listReminderRules: protectedProcedure.input(z.object({ organizationId: z.string().min(1), eventId: z.string().min(1) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(eventReminderRules).where(and(eq(eventReminderRules.organizationId, input.organizationId), eq(eventReminderRules.eventId, input.eventId))).orderBy(asc(eventReminderRules.minutesBefore));
    }),
    addReminderRule: protectedProcedure.input(z.object({ organizationId: z.string().min(1), eventId: z.string().min(1), templateName: z.string().trim().min(3).max(80).regex(/^[a-z0-9_]+$/i), minutesBefore: z.number().int().min(60).max(43200) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.EVENT_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const eventResult = await db.select().from(events).where(and(eq(events.id, input.eventId), eq(events.organizationId, input.organizationId))).limit(1);
      if (!eventResult[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Acara tidak ditemukan" });
      const [rule] = await db.insert(eventReminderRules).values({ organizationId: input.organizationId, eventId: input.eventId, templateName: input.templateName, minutesBefore: input.minutesBefore, enabled: true }).returning();
      if (rule) {
        const reminderAt = new Date(eventResult[0].startsAt.getTime() - input.minutesBefore * 60_000);
        const cron = `0 ${reminderAt.getUTCMinutes()} ${reminderAt.getUTCHours()} ${reminderAt.getUTCDate()} ${reminderAt.getUTCMonth() + 1} *`;
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        try {
          const job = await createHeartbeatJob({ name: `event-reminder-${rule.id}`, cron, path: "/api/scheduled/event-reminder", description: `Reminder acara ${eventResult[0].title}` }, sessionToken);
          await db.update(eventReminderRules).set({ scheduleCronTaskUid: job.taskUid, updatedAt: new Date() }).where(eq(eventReminderRules.id, rule.id));
        } catch (error) {
          await db.update(eventReminderRules).set({ enabled: false, updatedAt: new Date() }).where(eq(eventReminderRules.id, rule.id));
          throw error;
        }
        await logAudit({ actorId: ctx.user.id, action: "create", resource: "event_reminder_rule", resourceId: rule.id, metadata: { organizationId: input.organizationId, eventId: input.eventId } });
      }
      return rule;
    }),
    publish: protectedProcedure.input(z.object({ organizationId: z.string().min(1), eventId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.EVENT_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [published] = await db.update(events).set({ status: "published", updatedAt: new Date() }).where(and(eq(events.id, input.eventId), eq(events.organizationId, input.organizationId))).returning();
      if (!published) throw new TRPCError({ code: "NOT_FOUND", message: "Acara tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "publish", resource: "event", resourceId: published.id, metadata: { organizationId: input.organizationId } });
      return published;
    }),
    register: protectedProcedure.input(z.object({ eventId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const eventResult = await db.select().from(events).where(eq(events.id, input.eventId)).limit(1);
      const event = eventResult[0];
      if (!event || event.status !== "published") throw new TRPCError({ code: "NOT_FOUND", message: "Acara tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, event.organizationId);
      if (event.capacity !== null && event.capacity !== undefined) {
        const [registered] = await db.select({ value: count(eventRegistrations.userId) }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, "registered")));
        if (Number(registered?.value ?? 0) >= event.capacity) {
          const [existing] = await db.select({ status: eventRegistrations.status }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, ctx.user.id))).limit(1);
          if (existing?.status !== "registered") throw new TRPCError({ code: "CONFLICT", message: "Kapasitas acara sudah penuh" });
        }
      }
      const [registration] = await db.insert(eventRegistrations).values({ eventId: event.id, userId: ctx.user.id, status: "registered" }).onConflictDoUpdate({ target: [eventRegistrations.eventId, eventRegistrations.userId], set: { status: "registered", updatedAt: new Date() } }).returning();
      return registration;
    }),
  }),
  announcements: router({
    list: protectedProcedure.input(organizationIdInput.extend({ limit: z.number().int().min(1).max(100).default(20), offset: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      const access = await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      const canManage = ["platform_admin", "organization_admin", "rw_admin", "rt_admin"].includes(access.role);
      return db.select().from(announcements).where(canManage ? eq(announcements.organizationId, input.organizationId) : and(eq(announcements.organizationId, input.organizationId), eq(announcements.status, "published"))).orderBy(desc(announcements.publishedAt)).limit(input.limit).offset(input.offset);
    }),
    create: protectedProcedure.input(organizationIdInput.extend({ title: z.string().trim().min(3).max(160), slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+$/), body: z.string().trim().min(3).max(5000), scopeType: z.enum(["organization", "rw", "rt"]).default("organization"), scopeId: z.string().nullable().default(null) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.ANNOUNCEMENT_CREATE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const existing = await db.select({ id: announcements.id }).from(announcements).where(and(eq(announcements.organizationId, input.organizationId), eq(announcements.slug, input.slug))).limit(1);
      if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "Slug pengumuman sudah digunakan. Ubah judul agar lebih spesifik." });
      const [created] = await db.insert(announcements).values({ organizationId: input.organizationId, title: input.title, slug: input.slug, body: input.body, createdBy: ctx.user.id, status: "draft", scopeType: input.scopeType, scopeId: input.scopeId }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "announcement", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    publish: protectedProcedure.input(z.object({ organizationId: z.string().min(1), announcementId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.ANNOUNCEMENT_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [published] = await db.update(announcements).set({ status: "published", publishedAt: new Date(), updatedAt: new Date() }).where(and(eq(announcements.id, input.announcementId), eq(announcements.organizationId, input.organizationId))).returning();
      if (!published) throw new TRPCError({ code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "publish", resource: "announcement", resourceId: published.id, metadata: { organizationId: input.organizationId } });
      return published;
    }),
  }),
  campaigns: router({
    create: protectedProcedure.input(z.object({ organizationId: z.string().min(1), title: z.string().trim().min(3).max(160), slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+$/), description: z.string().trim().max(5000).optional(), targetAmount: z.number().int().min(0).max(100000000000), startsAt: z.number().int().positive().optional(), endsAt: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_CREATE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const existing = await db.select({ id: campaigns.id }).from(campaigns).where(and(eq(campaigns.organizationId, input.organizationId), eq(campaigns.slug, input.slug))).limit(1);
      if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "Slug kampanye sudah digunakan. Ubah judul agar lebih spesifik." });
      const [created] = await db.insert(campaigns).values({ organizationId: input.organizationId, title: input.title, slug: input.slug, description: input.description, targetAmount: input.targetAmount, startsAt: input.startsAt ? new Date(input.startsAt) : undefined, endsAt: input.endsAt ? new Date(input.endsAt) : undefined, status: "draft" }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "campaign", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    publish: protectedProcedure.input(z.object({ organizationId: z.string().min(1), campaignId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [published] = await db.update(campaigns).set({ status: "published", updatedAt: new Date() }).where(and(eq(campaigns.id, input.campaignId), eq(campaigns.organizationId, input.organizationId))).returning();
      if (!published) throw new TRPCError({ code: "NOT_FOUND", message: "Kampanye tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "publish", resource: "campaign", resourceId: published.id, metadata: { organizationId: input.organizationId } });
      return published;
    }),
    list: protectedProcedure.input(organizationIdInput.extend({ limit: z.number().int().min(1).max(100).default(20), offset: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(campaigns).where(and(eq(campaigns.organizationId, input.organizationId), eq(campaigns.status, "published"))).orderBy(asc(campaigns.startsAt));
      return Promise.all(rows.map(async campaign => {
        const [donationTotals, usageTotals] = await Promise.all([
          db.select({ raisedAmount: sum(donations.amount), verifiedDonors: count(donations.id) }).from(donations).where(and(eq(donations.campaignId, campaign.id), eq(donations.status, "verified"))),
          db.select({ usedAmount: sum(fundUsages.amount) }).from(fundUsages).where(eq(fundUsages.campaignId, campaign.id)),
        ]);
        return { ...campaign, raisedAmount: Number(donationTotals[0]?.raisedAmount ?? 0), verifiedDonors: Number(donationTotals[0]?.verifiedDonors ?? 0), usedAmount: Number(usageTotals[0]?.usedAmount ?? 0) };
      }));
    }),
    drafts: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(campaigns).where(and(eq(campaigns.organizationId, input.organizationId), eq(campaigns.status, "draft"))).orderBy(asc(campaigns.createdAt));
    }),
    pending: protectedProcedure.input(organizationIdInput.extend({ campaignId: z.string().min(1).max(80).optional() })).query(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(campaigns.organizationId, input.organizationId), eq(donations.status, "submitted")];
      if (input.campaignId) conditions.push(eq(campaigns.id, input.campaignId));
      return db.select({ donation: donations, campaign: campaigns, donor: users }).from(donations).innerJoin(campaigns, eq(campaigns.id, donations.campaignId)).innerJoin(users, eq(users.id, donations.donorId)).where(and(...conditions)).orderBy(asc(donations.createdAt));
    }),
    contribute: protectedProcedure.input(z.object({ campaignId: z.string().min(1), amount: z.number().int().positive().max(1000000000), visibility: z.enum(["named", "anonymous"]).default("named") })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
      const campaign = result[0];
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Kampanye tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, campaign.organizationId);
      const [donation] = await db.insert(donations).values({ campaignId: campaign.id, donorId: ctx.user.id, amount: input.amount, visibility: input.visibility, status: "submitted" }).returning();
      if (donation) await logAudit({ actorId: ctx.user.id, action: "contribute", resource: "donation", resourceId: donation.id, metadata: { campaignId: campaign.id } });
      return donation;
    }),
    verifyDonation: protectedProcedure.input(z.object({ organizationId: z.string().min(1), donationId: z.string().min(1), status: z.enum(["verified", "rejected"]) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ donation: donations, campaign: campaigns }).from(donations).innerJoin(campaigns, eq(campaigns.id, donations.campaignId)).where(and(eq(donations.id, input.donationId), eq(campaigns.organizationId, input.organizationId))).limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Kontribusi tidak ditemukan" });
      await db.update(donations).set({ status: input.status, updatedAt: new Date() }).where(eq(donations.id, input.donationId));
      await logAudit({ actorId: ctx.user.id, action: input.status, resource: "donation", resourceId: input.donationId, metadata: { organizationId: input.organizationId } });
      return { success: true, status: input.status } as const;
    }),
    addFundUsage: protectedProcedure.input(z.object({ organizationId: z.string().min(1), campaignId: z.string().min(1), amount: z.number().int().positive().max(1000000000), description: z.string().trim().min(3).max(500), evidenceFileId: z.string().min(1).optional() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const campaignResult = await db.select().from(campaigns).where(and(eq(campaigns.id, input.campaignId), eq(campaigns.organizationId, input.organizationId))).limit(1);
      if (!campaignResult[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Kampanye tidak ditemukan" });
      if (input.evidenceFileId) {
        const evidence = await db.select().from(files).where(and(eq(files.id, input.evidenceFileId), eq(files.visibility, "private"))).limit(1);
        if (!evidence[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Bukti penggunaan dana tidak ditemukan" });
      }
      const [usage] = await db.insert(fundUsages).values({ campaignId: input.campaignId, amount: input.amount, description: input.description, evidenceFileId: input.evidenceFileId }).returning();
      if (usage) await logAudit({ actorId: ctx.user.id, action: "fund_usage", resource: "campaign", resourceId: input.campaignId, metadata: { amount: input.amount } });
      return usage;
    }),
  }),
  forum: router({
    listTopics: protectedProcedure.input(organizationIdInput.extend({ limit: z.number().int().min(1).max(50).default(20), offset: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(forumTopics).where(and(eq(forumTopics.organizationId, input.organizationId), eq(forumTopics.status, "open"))).orderBy(asc(forumTopics.createdAt)).limit(input.limit).offset(input.offset);
    }),
    createTopic: protectedProcedure.input(organizationIdInput.extend({ title: z.string().trim().min(3).max(160), scopeType: z.enum(["general", "event", "announcement", "campaign"]).default("general"), scopeId: z.string().max(80).optional() })).mutation(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [topic] = await db.insert(forumTopics).values({ organizationId: input.organizationId, title: input.title, scopeType: input.scopeType, scopeId: input.scopeId, status: "open" }).returning();
      if (topic) {
        await logAudit({ actorId: ctx.user.id, action: "create", resource: "forum_topic", resourceId: topic.id, metadata: { organizationId: input.organizationId, scopeType: input.scopeType } });
        emitForumEvent(input.organizationId, "forum:new-topic", { topicId: topic.id, title: topic.title });
      }
      return topic;
    }),
    reportPost: protectedProcedure.input(z.object({ postId: z.string().min(1), reason: z.string().trim().min(3).max(300) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ post: forumPosts, topic: forumTopics }).from(forumPosts).innerJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId)).where(eq(forumPosts.id, input.postId)).limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Posting tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, result[0].topic.organizationId);
      const [report] = await db.insert(forumReports).values({ postId: input.postId, reporterId: ctx.user.id, reason: input.reason, status: "open" }).returning();
      return report;
    }),
    reviewReport: protectedProcedure.input(z.object({ organizationId: z.string().min(1), reportId: z.string().min(1), status: z.enum(["reviewed", "dismissed", "actioned"])})).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.FORUM_MODERATE);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ report: forumReports, topic: forumTopics }).from(forumReports).innerJoin(forumPosts, eq(forumPosts.id, forumReports.postId)).innerJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId)).where(and(eq(forumReports.id, input.reportId), eq(forumTopics.organizationId, input.organizationId))).limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Laporan tidak ditemukan" });
      await db.update(forumReports).set({ status: input.status, updatedAt: new Date() }).where(eq(forumReports.id, input.reportId));
      if (input.status === "actioned") await db.update(forumPosts).set({ status: "hidden", updatedAt: new Date() }).where(eq(forumPosts.id, result[0].report.postId));
      await logAudit({ actorId: ctx.user.id, action: `forum_report_${input.status}`, resource: "forum_report", resourceId: input.reportId, metadata: { organizationId: input.organizationId } });
      return { success: true, status: input.status } as const;
    }),
    listPosts: protectedProcedure.input(z.object({ topicId: z.string().min(1) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const topicResult = await db.select().from(forumTopics).where(eq(forumTopics.id, input.topicId)).limit(1);
      const topic = topicResult[0];
      if (!topic) return [];
      await requireOrganizationAccess(ctx.user.id, topic.organizationId);
      return db.select({ post: forumPosts, author: users }).from(forumPosts).innerJoin(users, eq(users.id, forumPosts.authorId)).where(and(eq(forumPosts.topicId, input.topicId), eq(forumPosts.status, "published"))).orderBy(asc(forumPosts.createdAt));
    }),
    findOrCreateTopic: protectedProcedure.input(organizationIdInput.extend({ scopeType: z.enum(["general", "event", "announcement", "campaign"]), scopeId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const existing = await db.select().from(forumTopics).where(and(eq(forumTopics.organizationId, input.organizationId), eq(forumTopics.scopeType, input.scopeType), eq(forumTopics.scopeId, input.scopeId), eq(forumTopics.status, "open"))).limit(1);
      if (existing[0]) return existing[0];
      const [topic] = await db.insert(forumTopics).values({ organizationId: input.organizationId, title: `Diskusi ${input.scopeType}`, scopeType: input.scopeType, scopeId: input.scopeId, status: "open" }).returning();
      return topic;
    }),
    createPost: protectedProcedure.input(z.object({ topicId: z.string().min(1), body: z.string().trim().min(1).max(3000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const topicResult = await db.select().from(forumTopics).where(and(eq(forumTopics.id, input.topicId), eq(forumTopics.status, "open"))).limit(1);
      const topic = topicResult[0];
      if (!topic) throw new TRPCError({ code: "NOT_FOUND", message: "Topik forum tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, topic.organizationId);
      const [post] = await db.insert(forumPosts).values({ topicId: topic.id, authorId: ctx.user.id, body: input.body, status: "published" }).returning();
      if (post) emitForumEvent(topic.organizationId, "forum:new-post", { topicId: topic.id, postId: post.id, authorId: ctx.user.id, body: post.body });
      return post;
    }),
  }),
  files: router({
    uploadCampaignEvidence: protectedProcedure.input(z.object({ organizationId: z.string().min(1), filename: z.string().trim().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]), contentBase64: z.string().min(10).max(7000000) })).mutation(async ({ ctx, input }) => {
      await requireOrganizationRole(ctx.user.id, input.organizationId, ["admin", "treasurer"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const buffer = Buffer.from(input.contentBase64, "base64");
      if (buffer.byteLength > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Ukuran bukti maksimal 5 MB" });
      const path = `campaign-evidence/${input.organizationId}/${ctx.user.id}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      await uploadPrivateObject({ bucket: "smart-warga-private", path, body: buffer, contentType: input.mimeType });
      const [file] = await db.insert(files).values({ ownerId: ctx.user.id, bucket: "smart-warga-private", path, filename: input.filename, mimeType: input.mimeType, size: buffer.byteLength, visibility: "private" }).returning();
      return file;
    }),
    listOwned: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: files.id, filename: files.filename, mimeType: files.mimeType, size: files.size, createdAt: files.createdAt }).from(files).where(and(eq(files.ownerId, ctx.user.id), eq(files.visibility, "private"))).orderBy(desc(files.createdAt)).limit(50);
    }),
    signedUrl: protectedProcedure.input(z.object({ fileId: z.string().min(1) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ file: files, organizationId: rwUnits.organizationId }).from(files).leftJoin(payments, eq(payments.proofFileId, files.id)).leftJoin(invoices, eq(invoices.id, payments.invoiceId)).leftJoin(households, eq(households.id, invoices.householdId)).leftJoin(rtUnits, eq(rtUnits.id, households.rtId)).leftJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId)).where(eq(files.id, input.fileId)).limit(1);
      const target = result[0];
      const file = target?.file;
      if (!file || file.visibility !== "private") throw new TRPCError({ code: "FORBIDDEN", message: "File tidak dapat diakses" });
      let organizationId = target.organizationId;
      if (!organizationId) {
        const campaignEvidence = await db.select({ organizationId: campaigns.organizationId }).from(fundUsages).innerJoin(campaigns, eq(campaigns.id, fundUsages.campaignId)).where(eq(fundUsages.evidenceFileId, input.fileId)).limit(1);
        organizationId = campaignEvidence[0]?.organizationId ?? null;
      }
      if (file.ownerId !== ctx.user.id) {
        if (!organizationId) throw new TRPCError({ code: "FORBIDDEN", message: "File tidak terkait wilayah yang dapat diverifikasi" });
        await requirePermission(ctx.user.id, organizationId, P.BILLING_VIEW_OWN);
      }
      return { url: await createPrivateSignedUrl({ bucket: file.bucket, path: file.path, expiresInSeconds: 300 }), expiresInSeconds: 300 };
    }),
  }),
});

export type AppRouter = typeof appRouter;
