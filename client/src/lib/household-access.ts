export const HOUSEHOLD_MANAGER_ROLES = ["platform_admin", "organization_admin", "rw_admin", "rt_admin"] as const;

export function canManageHouseholdMembers(role?: string | null) {
  return role != null && HOUSEHOLD_MANAGER_ROLES.includes(role as (typeof HOUSEHOLD_MANAGER_ROLES)[number]);
}
