import { describe, expect, it } from "vitest";
import { canManageCampaigns, campaignReviewRefreshTargets } from "../client/src/lib/campaign-workflow";

describe("campaign workflow UI contracts", () => {
  it("allows only administrators to manage campaign drafts", () => {
    expect(canManageCampaigns("platform_admin")).toBe(true);
    expect(canManageCampaigns("organization_admin")).toBe(true);
    expect(canManageCampaigns("rw_admin")).toBe(true);
    expect(canManageCampaigns("rt_admin")).toBe(true);
    expect(canManageCampaigns("treasurer")).toBe(false);
    expect(canManageCampaigns("resident")).toBe(false);
    expect(canManageCampaigns()).toBe(false);
  });

  it("refreshes both pending reviews and published campaign aggregates", () => {
    expect(campaignReviewRefreshTargets()).toEqual(["pending", "campaigns"]);
  });
});
