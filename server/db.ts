import { createClient } from "@libsql/client";
import { and, count, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.TURSO_DATABASE_URL) {
    try {
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect to Turso:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: Turso is not configured");
    return;
  }

  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    phone: user.phone ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "platform_admin" : "resident"),
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: values.name,
      email: values.email,
      phone: values.phone,
      loginMethod: values.loginMethod,
      lastSignedIn: values.lastSignedIn,
      updatedAt: new Date(),
      ...(user.role ? { role: user.role } : {}),
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: Turso is not configured");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

import { auditLogs, billingPeriods, billingTypes, campaigns, events, forumTopics, householdMembers, households, invoices, organizationMembers, organizations, rtUnits, rwUnits } from "../drizzle/schema";

export async function logAudit(input: { actorId?: number; action: string; resource: string; resourceId?: string; metadata?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    actorId: input.actorId,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
  });
}

export async function getUserOrganizations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ organization: organizations, membership: organizationMembers })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId));
}

export async function getOrganizationSummary(organizationId: string) {
  const db = await getDb();
  if (!db) return null;
  const [householdCount, residentCount, invoiceCount, eventCount, campaignCount, topicCount] = await Promise.all([
    db.select({ count: count() }).from(households)
      .innerJoin(rtUnits, eq(rtUnits.id, households.rtId))
      .innerJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId))
      .where(eq(rwUnits.organizationId, organizationId)),
    db.select({ count: count() }).from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId)),
    db.select({ count: count() }).from(invoices)
      .innerJoin(billingPeriods, eq(billingPeriods.id, invoices.billingPeriodId))
      .innerJoin(billingTypes, eq(billingTypes.id, billingPeriods.billingTypeId))
      .where(eq(billingTypes.organizationId, organizationId)),
    db.select({ count: count() }).from(events).where(eq(events.organizationId, organizationId)),
    db.select({ count: count() }).from(campaigns).where(eq(campaigns.organizationId, organizationId)),
    db.select({ count: count() }).from(forumTopics).where(eq(forumTopics.organizationId, organizationId)),
  ]);
  return {
    households: householdCount[0]?.count ?? 0,
    residents: residentCount[0]?.count ?? 0,
    invoices: invoiceCount[0]?.count ?? 0,
    events: eventCount[0]?.count ?? 0,
    campaigns: campaignCount[0]?.count ?? 0,
    forumTopics: topicCount[0]?.count ?? 0,
  };
}

export async function searchOrganizationResidents(organizationId: string, query: string, limit = 25, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const normalized = `%${query.trim()}%`;
  return db.selectDistinct({ user: users, membership: organizationMembers })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .leftJoin(householdMembers, eq(householdMembers.userId, users.id))
    .leftJoin(households, eq(households.id, householdMembers.householdId))
    .leftJoin(rtUnits, eq(rtUnits.id, households.rtId))
    .leftJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId))
    .where(and(
      eq(organizationMembers.organizationId, organizationId),
      or(
        like(users.name, normalized),
        like(users.email, normalized),
        and(eq(rwUnits.organizationId, organizationId), like(households.address, normalized)),
      ),
    ))
    .orderBy(desc(users.createdAt))
    .limit(Math.min(limit, 100))
    .offset(Math.max(offset, 0));
}
