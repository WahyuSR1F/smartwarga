export type CampaignRole = "platform_admin" | "organization_admin" | "rw_admin" | "rt_admin" | "treasurer" | "resident";

export function canManageCampaigns(role?: CampaignRole) {
  return role === "platform_admin" || role === "organization_admin" || role === "rw_admin" || role === "rt_admin";
}

export function campaignReviewRefreshTargets() {
  return ["pending", "campaigns"] as const;
}
