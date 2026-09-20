import { describe, expect, it } from "vitest";
import { campaignReviewAction, campaignReviewLabel } from "../client/src/lib/campaign-review-ui";

describe("campaign review UI contracts", () => {
  it("maps submitted and terminal statuses to truthful labels", () => {
    expect(campaignReviewLabel("submitted")).toBe("Menunggu verifikasi");
    expect(campaignReviewLabel("verified")).toBe("Terverifikasi");
    expect(campaignReviewLabel("rejected")).toBe("Ditolak");
  });

  it("builds the exact verify and reject mutation payloads", () => {
    expect(campaignReviewAction("donation-1", "verified")).toEqual({ donationId: "donation-1", status: "verified" });
    expect(campaignReviewAction("donation-2", "rejected")).toEqual({ donationId: "donation-2", status: "rejected" });
  });
});
