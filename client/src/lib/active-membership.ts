export type MembershipOption = {
  organization: { id: string; name: string };
  membership: {
    role: string;
    scopeType?: string | null;
    scopeId?: string | null;
  };
};

export function selectActiveMembership<T extends MembershipOption>(
  memberships: T[] | undefined,
  requestedOrganizationId?: string,
) {
  if (!memberships?.length) return undefined;
  return (
    memberships.find(
      (item) => item.organization.id === requestedOrganizationId,
    ) ?? memberships[0]
  );
}

export function organizationPath(
  pathname: string,
  organizationId: string,
) {
  return `${pathname}?organization=${encodeURIComponent(organizationId)}`;
}

/** Get a human-readable scope label */
export function scopeLabel(
  scopeType?: string | null,
  scopeId?: string | null,
): string | null {
  if (!scopeType || scopeType === "organization") return null;
  return `${scopeType.toUpperCase()} ${scopeId ?? ""}`;
}
