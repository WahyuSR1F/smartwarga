import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getUserOrganizations: vi.fn(), uploadPrivateObject: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, getUserOrganizations: mocks.getUserOrganizations, logAudit: vi.fn() }));
vi.mock("./supabaseStorage", () => ({ uploadPrivateObject: mocks.uploadPrivateObject }));

import { appRouter } from "./routers";

function context() {
  return { user: { id: 1, openId: "campaign-test", name: "Treasurer", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };
}

function dbWith(campaign: unknown[], evidence: unknown[]) {
  let selectCount = 0;
  const makeQuery = (result: unknown[]) => { const q: any = { from: vi.fn(), where: vi.fn(), limit: vi.fn() }; q.from.mockReturnValue(q); q.where.mockReturnValue(q); q.limit.mockResolvedValue(result); return q; };
  const usage = { id: "usage-1", campaignId: "campaign-1", amount: 12000, description: "Cat ulang pos ronda", evidenceFileId: "file-1" };
  return { select: vi.fn(() => makeQuery(selectCount++ === 0 ? campaign : evidence)), insert: vi.fn(() => ({ values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([usage]) })) };
}

describe("campaign fund-use evidence", () => {
  beforeEach(() => {
    mocks.getDb.mockReset();
    mocks.uploadPrivateObject.mockReset();
    mocks.uploadPrivateObject.mockResolvedValue({ bucket: "smart-warga-private", path: "campaign-evidence/org-1/1/proof.png" });
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "treasurer", status: "active" } }]);
  });

  it("uploads campaign evidence as a private file for an authorized treasurer", async () => {
    const db = { insert: vi.fn(() => ({ values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([{ id: "file-1", visibility: "private", filename: "proof.png" }]) })) };
    mocks.getDb.mockResolvedValue(db);
    const result = await appRouter.createCaller(context()).files.uploadCampaignEvidence({ organizationId: "org-1", filename: "proof.png", mimeType: "image/png", contentBase64: "cHJpdmF0ZS1wcm9vZg==" });
    expect(result).toMatchObject({ id: "file-1", visibility: "private" });
    expect(mocks.uploadPrivateObject).toHaveBeenCalledWith(expect.objectContaining({ bucket: "smart-warga-private", contentType: "image/png" }));
  });

  it("stores a validated private evidence-file reference", async () => {
    mocks.getDb.mockResolvedValue(dbWith([{ id: "campaign-1", organizationId: "org-1" }], [{ id: "file-1", visibility: "private" }]));
    const result = await appRouter.createCaller(context()).campaigns.addFundUsage({ organizationId: "org-1", campaignId: "campaign-1", amount: 12000, description: "Cat ulang pos ronda", evidenceFileId: "file-1" });
    expect(result).toMatchObject({ evidenceFileId: "file-1" });
  });

  it("rejects a missing private evidence file", async () => {
    mocks.getDb.mockResolvedValue(dbWith([{ id: "campaign-1", organizationId: "org-1" }], []));
    await expect(appRouter.createCaller(context()).campaigns.addFundUsage({ organizationId: "org-1", campaignId: "campaign-1", amount: 12000, description: "Cat ulang pos ronda", evidenceFileId: "missing-file" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
