/**
 * Server-side authorization middleware for Smart Warga.
 *
 * Flow:
 *   authenticate → resolve membership → check permission → resolve scope → filter resource
 *
 * This is the SINGLE SOURCE OF TRUTH for authorization.
 * Client-side UI hiding is UX only, never security.
 */

import { TRPCError } from "@trpc/server";
import { eq, and, or } from "drizzle-orm";
import { organizationMembers, rwUnits, rtUnits } from "../../drizzle/schema";
import { getDb, getUserOrganizations } from "../db";
import {
  type Permission,
  type ScopeType,
  type ResourceScope,
  type CommunityRole,
  roleHasPermission,
  canAccessScope,
  canManageScope,
  P,
} from "./permissions";

export type { ResourceScope, CommunityRole } from "./permissions";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MembershipContext {
  organizationId: string;
  role: CommunityRole;
  scopeType: ScopeType | null;
  scopeId: string | null;
  status: string;
}

export interface AuthorizationResult {
  membership: MembershipContext;
  allowed: true;
}

// ─── Membership Resolution ───────────────────────────────────────────────────

/**
 * Get a user's active membership for a specific organization.
 * Returns null if no active membership exists.
 */
export async function getMembership(
  userId: number,
  organizationId: string,
): Promise<MembershipContext | null> {
  const memberships = await getUserOrganizations(userId);
  const found = memberships.find(item => item.organization.id === organizationId);
  if (!found || found.membership.status !== "active") return null;

  return {
    organizationId,
    role: found.membership.role as CommunityRole,
    scopeType: (found.membership.scopeType as ScopeType) ?? "organization",
    scopeId: found.membership.scopeId,
    status: found.membership.status,
  };
}

/**
 * Check if user is a platform admin (global admin).
 */
export async function isPlatformAdmin(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.role, "platform_admin"),
        eq(organizationMembers.status, "active"),
      ),
    )
    .limit(1);

  return !!result[0];
}

// ─── Authorization Functions ─────────────────────────────────────────────────

/**
 * Require that the user has an active membership in the organization.
 * Returns the membership context.
 */
export async function requireMembership(
  userId: number,
  organizationId: string,
): Promise<MembershipContext> {
  const membership = await getMembership(userId, organizationId);
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Anda tidak memiliki akses ke wilayah ini",
    });
  }
  return membership;
}

/**
 * Require that the user has a specific permission in the organization.
 * Returns the membership context.
 */
export async function requirePermission(
  userId: number,
  organizationId: string,
  permission: Permission,
): Promise<MembershipContext> {
  const membership = await requireMembership(userId, organizationId);

  if (!roleHasPermission(membership.role, permission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Peran Anda tidak dapat melakukan tindakan ini",
    });
  }

  return membership;
}

/**
 * Require that the user can access a scoped resource (read).
 * Returns the membership context.
 */
export async function requireScopeAccess(
  userId: number,
  organizationId: string,
  permission: Permission,
  resourceScope: ResourceScope,
): Promise<MembershipContext> {
  const membership = await requirePermission(userId, organizationId, permission);

  if (!canAccessScope(membership.scopeType, membership.scopeId, resourceScope.type, resourceScope.id)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Anda tidak memiliki akses ke wilayah ini",
    });
  }

  return membership;
}

/**
 * Require that the user can manage (write) a scoped resource.
 * Returns the membership context.
 */
export async function requireScopeManage(
  userId: number,
  organizationId: string,
  permission: Permission,
  resourceScope: ResourceScope,
): Promise<MembershipContext> {
  const membership = await requirePermission(userId, organizationId, permission);

  if (!canManageScope(membership.scopeType, membership.scopeId, resourceScope.type, resourceScope.id)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Anda tidak memiliki akses untuk mengelola wilayah ini",
    });
  }

  return membership;
}

// ─── Scope Helpers ───────────────────────────────────────────────────────────

/**
 * Resolve the scope of a resource given its organization + optional rw/rt references.
 */
export async function resolveResourceScope(
  organizationId: string,
  rwId?: string | null,
  rtId?: string | null,
): Promise<ResourceScope> {
  if (rtId) {
    return { type: "rt", id: rtId };
  }
  if (rwId) {
    return { type: "rw", id: rwId };
  }
  return { type: "organization", id: organizationId };
}

/**
 * Get the RW ID that an RT belongs to.
 */
export async function getRtRwId(rtId: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({ rwId: rtUnits.rwId })
    .from(rtUnits)
    .where(eq(rtUnits.id, rtId))
    .limit(1);

  return result[0]?.rwId ?? null;
}

/**
 * Get the organization ID that a RW belongs to.
 */
export async function getRwOrganizationId(rwId: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({ organizationId: rwUnits.organizationId })
    .from(rwUnits)
    .where(eq(rwUnits.id, rwId))
    .limit(1);

  return result[0]?.organizationId ?? null;
}

/**
 * Get all RT IDs under a specific RW.
 */
export async function getRwRtIds(rwId: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ id: rtUnits.id })
    .from(rtUnits)
    .where(eq(rtUnits.rwId, rwId));

  return result.map((r) => r.id);
}

/**
 * Get all RW IDs in an organization.
 */
export async function getOrganizationRwIds(organizationId: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ id: rwUnits.id })
    .from(rwUnits)
    .where(eq(rwUnits.organizationId, organizationId));

  return result.map((r) => r.id);
}

/**
 * Build a scope filter for Drizzle queries based on membership scope.
 * Returns a Drizzle condition that filters resources to those the user can see.
 */
export function buildScopeCondition(
  membership: MembershipContext,
  orgColumn: any,
  rwColumn?: any,
  rtColumn?: any,
  scopeTypeColumn?: any,
  scopeIdColumn?: any,
) {
  const { organizationId, scopeType, scopeId } = membership;

  // Platform admin: no filter (but should be filtered by org in most cases)
  // Organization admin: see everything in org
  if (!scopeType || scopeType === "organization") {
    return eq(orgColumn, organizationId);
  }

  // For scoped resources (events, announcements, billing with scope columns)
  if (scopeTypeColumn && scopeIdColumn) {
    // See org-level + own scope resources
    return and(
      eq(orgColumn, organizationId),
      or(
        // Organization-level resources
        and(eq(scopeTypeColumn, "organization")),
        // Own scope resources
        and(eq(scopeTypeColumn, scopeType), eq(scopeIdColumn, scopeId)),
      ),
    );
  }

  // For hierarchical resources (households via rt → rw)
  if (scopeType === "rw" && rtColumn && rwColumn) {
    // RW admin: see all RTs under their RW
    // We need to join rt_units to rw_units
    // This is handled at the query level
    return eq(orgColumn, organizationId);
  }

  if (scopeType === "rt" && rtColumn) {
    // RT admin: see only their RT
    return and(eq(orgColumn, organizationId), eq(rtColumn, scopeId));
  }

  return eq(orgColumn, organizationId);
}



/**
 * Simplified household scope check.
 * Returns true if the membership can access the household's RT.
 */
export async function isHouseholdInScope(
  membership: MembershipContext,
  householdRtId: string,
): Promise<boolean> {
  if (!membership.scopeType || membership.scopeType === "organization") {
    return true;
  }

  if (membership.scopeType === "rt") {
    return householdRtId === membership.scopeId;
  }

  if (membership.scopeType === "rw") {
    // Check if RT belongs to this RW
    const rtRwId = await getRtRwId(householdRtId);
    return rtRwId === membership.scopeId;
  }

  return false;
}
