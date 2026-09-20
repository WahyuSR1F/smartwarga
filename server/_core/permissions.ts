/**
 * Permission-based authorization system for Smart Warga.
 *
 * Architecture:
 *   USER → MEMBERSHIP → ORGANIZATION → ROLE → SCOPE → PERMISSION → RESOURCE
 *
 * Roles:
 *   platform_admin   — global admin, accesses all organizations
 *   organization_admin — manages entire organization (desa/kelurahan)
 *   rw_admin         — manages a specific RW and all RTs under it
 *   rt_admin         — manages a specific RT
 *   treasurer        — manages finances within scope
 *   resident         — regular member, read-only + own actions
 */

// ─── Permission Constants ────────────────────────────────────────────────────

export const P = {
  // Resident permissions
  RESIDENT_VIEW_OWN: "resident.view_own",
  BILLING_VIEW_OWN: "billing.view_own",
  PAYMENT_SUBMIT: "payment.submit",
  EVENT_REGISTER: "event.register",
  FORUM_CREATE: "forum.create",
  FORUM_VIEW: "forum.view",
  FORUM_MODERATE: "forum.moderate",
  CAMPAIGN_CONTRIBUTE: "campaign.contribute",

  // RT Admin permissions (inherits resident +)
  RESIDENT_VIEW: "resident.view",
  RESIDENT_MANAGE: "resident.manage",
  HOUSEHOLD_VIEW: "household.view",
  HOUSEHOLD_MANAGE: "household.manage",
  EVENT_CREATE: "event.create",
  EVENT_MANAGE: "event.manage",
  ANNOUNCEMENT_CREATE: "announcement.create",
  ANNOUNCEMENT_MANAGE: "announcement.manage",
  BILLING_MANAGE: "billing.manage",
  CAMPAIGN_CREATE: "campaign.create",
  CAMPAIGN_MANAGE: "campaign.manage",
  JOIN_REQUEST_VIEW: "join_request.view",
  JOIN_REQUEST_APPROVE: "join_request.approve",

  // RW Admin permissions (inherits RT +)
  RW_MANAGE: "rw.manage",
  RT_MANAGE: "rt.manage",
  RW_REPORT: "rw.report",

  // Organization Admin permissions (inherits RW +)
  ORGANIZATION_MANAGE: "organization.manage",
  RW_CREATE: "rw.create",
  RT_CREATE: "rt.create",
  ORGANIZATION_REPORT: "organization.report",

  // Platform Admin
  PLATFORM_MANAGE: "platform.manage",
} as const;

export type Permission = (typeof P)[keyof typeof P];

/** Roles that a membership can have within an organization */
export type CommunityRole = "platform_admin" | "organization_admin" | "rw_admin" | "rt_admin" | "treasurer" | "resident";

// ─── Role → Permission Mapping ───────────────────────────────────────────────

const RESIDENT_PERMISSIONS: Permission[] = [
  P.RESIDENT_VIEW_OWN,
  P.BILLING_VIEW_OWN,
  P.PAYMENT_SUBMIT,
  P.EVENT_REGISTER,
  P.FORUM_CREATE,
  P.FORUM_VIEW,
  P.CAMPAIGN_CONTRIBUTE,
];

const RT_ADMIN_PERMISSIONS: Permission[] = [
  ...RESIDENT_PERMISSIONS,
  P.RESIDENT_VIEW,
  P.RESIDENT_MANAGE,
  P.HOUSEHOLD_VIEW,
  P.HOUSEHOLD_MANAGE,
  P.EVENT_CREATE,
  P.EVENT_MANAGE,
  P.ANNOUNCEMENT_CREATE,
  P.ANNOUNCEMENT_MANAGE,
  P.BILLING_MANAGE,
  P.CAMPAIGN_CREATE,
  P.CAMPAIGN_MANAGE,
  P.JOIN_REQUEST_VIEW,
  P.JOIN_REQUEST_APPROVE,
];

const RW_ADMIN_PERMISSIONS: Permission[] = [
  ...RT_ADMIN_PERMISSIONS,
  P.RW_MANAGE,
  P.RT_MANAGE,
  P.RW_REPORT,
];

const ORG_ADMIN_PERMISSIONS: Permission[] = [
  ...RW_ADMIN_PERMISSIONS,
  P.ORGANIZATION_MANAGE,
  P.RW_CREATE,
  P.RT_CREATE,
  P.ORGANIZATION_REPORT,
  P.FORUM_MODERATE,
];

const PLATFORM_ADMIN_PERMISSIONS: Permission[] = Object.values(P) as Permission[];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  platform_admin: PLATFORM_ADMIN_PERMISSIONS,
  organization_admin: ORG_ADMIN_PERMISSIONS,
  rw_admin: RW_ADMIN_PERMISSIONS,
  rt_admin: RT_ADMIN_PERMISSIONS,
  treasurer: [
    P.RESIDENT_VIEW_OWN,
    P.BILLING_VIEW_OWN,
    P.BILLING_MANAGE,
    P.PAYMENT_SUBMIT,
    P.EVENT_REGISTER,
    P.FORUM_CREATE,
    P.FORUM_VIEW,
    P.CAMPAIGN_CONTRIBUTE,
    P.CAMPAIGN_MANAGE,
  ],
  resident: RESIDENT_PERMISSIONS,
};

// ─── Scope Types ─────────────────────────────────────────────────────────────

export type ScopeType = "organization" | "rw" | "rt";

export interface ResourceScope {
  type: ScopeType;
  id: string;
}

// ─── Helper: Check if role has permission ────────────────────────────────────

export function roleHasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

// ─── Scope Resolution ────────────────────────────────────────────────────────

/**
 * Check if a membership's scope can access a resource scope.
 *
 * Hierarchy: organization > rw > rt
 *
 * - organization_admin: can access everything in org
 * - rw_admin: can access their RW + all RTs under it
 * - rt_admin: can only access their RT (and org-level resources)
 * - treasurer: scoped like rw_admin for financial data
 * - resident: scoped like rt_admin (their own data only)
 */
export function canAccessScope(
  membershipScopeType: ScopeType | null | undefined,
  membershipScopeId: string | null | undefined,
  resourceScopeType: ScopeType,
  resourceScopeId: string | null | undefined,
): boolean {
  // Organization-level membership can access everything in the org
  if (!membershipScopeType || membershipScopeType === "organization") {
    return true;
  }

  // RW-level membership
  if (membershipScopeType === "rw") {
    if (resourceScopeType === "organization") return true;
    if (resourceScopeType === "rw" && resourceScopeId === membershipScopeId) return true;
    if (resourceScopeType === "rt") {
      // RT belongs to this RW — caller must resolve this via DB
      // For now, return true and let the DB query filter
      return true;
    }
    return false;
  }

  // RT-level membership
  if (membershipScopeType === "rt") {
    if (resourceScopeType === "organization") return true;
    if (resourceScopeType === "rw") return false; // RT admin can't manage RW
    if (resourceScopeType === "rt" && resourceScopeId === membershipScopeId) return true;
    return false;
  }

  return false;
}

/**
 * Check if a membership's scope can manage (write) a resource scope.
 * More restrictive than read access.
 */
export function canManageScope(
  membershipScopeType: ScopeType | null | undefined,
  membershipScopeId: string | null | undefined,
  resourceScopeType: ScopeType,
  resourceScopeId: string | null | undefined,
): boolean {
  // Organization-level membership can manage everything
  if (!membershipScopeType || membershipScopeType === "organization") {
    return true;
  }

  // RW-level membership
  if (membershipScopeType === "rw") {
    if (resourceScopeType === "organization") return false; // can't manage org-level
    if (resourceScopeType === "rw" && resourceScopeId === membershipScopeId) return true;
    if (resourceScopeType === "rt") return true; // RW admin manages all RTs under them
    return false;
  }

  // RT-level membership
  if (membershipScopeType === "rt") {
    if (resourceScopeType === "organization") return false;
    if (resourceScopeType === "rw") return false;
    if (resourceScopeType === "rt" && resourceScopeId === membershipScopeId) return true;
    return false;
  }

  return false;
}
