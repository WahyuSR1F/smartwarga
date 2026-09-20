export type CampaignReviewStatus = "verified" | "rejected";

export function campaignReviewAction(donationId: string, status: CampaignReviewStatus) {
  return { donationId, status };
}

export function campaignReviewLabel(status: "submitted" | "verified" | "rejected") {
  return status === "submitted" ? "Menunggu verifikasi" : status === "verified" ? "Terverifikasi" : "Ditolak";
}
