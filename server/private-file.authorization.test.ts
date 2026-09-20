import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getUserOrganizations: vi.fn(), createPrivateSignedUrl: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, getUserOrganizations: mocks.getUserOrganizations }));
vi.mock("./supabaseStorage", () => ({ createPrivateSignedUrl: mocks.createPrivateSignedUrl }));

import { appRouter } from "./routers";

function createContext(userId: number) {
  return { user: { id: userId, openId: `file-${userId}`, name: "Tester", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as never, res: {} as never };
}

function dbForFile(ownerId: number, organizationId: string | null) {
  const target = { file: { id: "proof-1", ownerId, visibility: "private", bucket: "payment-proof", path: "proofs/proof-1.png" }, organizationId };
  const chain = { from: vi.fn(), leftJoin: vi.fn(), where: vi.fn(), limit: vi.fn() };
  chain.from.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValue([target]);
  return { select: vi.fn().mockReturnValue(chain) };
}

describe("files.signedUrl authorization", () => {
  beforeEach(() => {
    mocks.getDb.mockReset();
    mocks.getUserOrganizations.mockReset();
    mocks.createPrivateSignedUrl.mockReset();
    mocks.createPrivateSignedUrl.mockResolvedValue("https://storage.example.test/signed/proof-1");
  });

  it("allows the payment-proof owner", async () => {
    mocks.getDb.mockResolvedValue(dbForFile(1, "org-1"));
    const result = await appRouter.createCaller(createContext(1)).files.signedUrl({ fileId: "proof-1" });
    expect(result).toEqual({ url: "https://storage.example.test/signed/proof-1", expiresInSeconds: 300 });
    expect(mocks.getUserOrganizations).not.toHaveBeenCalled();
  });

  it("allows an authorized reviewer from the same organization", async () => {
    mocks.getDb.mockResolvedValue(dbForFile(1, "org-1"));
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "treasurer", status: "active" } }]);
    const result = await appRouter.createCaller(createContext(2)).files.signedUrl({ fileId: "proof-1" });
    expect(result.url).toContain("signed/proof-1");
    expect(mocks.createPrivateSignedUrl).toHaveBeenCalledWith({ bucket: "payment-proof", path: "proofs/proof-1.png", expiresInSeconds: 300 });
  });

  it("allows a same-organization treasurer to access private campaign evidence", async () => {
    const target = { file: { id: "evidence-1", ownerId: 1, visibility: "private", bucket: "smart-warga-private", path: "campaign-evidence/org-1/1/proof.png" }, organizationId: null };
    const fileQuery = { from: vi.fn(), leftJoin: vi.fn(), where: vi.fn(), limit: vi.fn().mockResolvedValue([target]) };
    fileQuery.from.mockReturnValue(fileQuery); fileQuery.leftJoin.mockReturnValue(fileQuery); fileQuery.where.mockReturnValue(fileQuery);
    const campaignQuery = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), limit: vi.fn().mockResolvedValue([{ organizationId: "org-1" }]) };
    campaignQuery.from.mockReturnValue(campaignQuery); campaignQuery.innerJoin.mockReturnValue(campaignQuery); campaignQuery.where.mockReturnValue(campaignQuery);
    mocks.getDb.mockResolvedValue({ select: vi.fn().mockReturnValueOnce(fileQuery).mockReturnValueOnce(campaignQuery) });
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "treasurer", status: "active" } }]);
    const result = await appRouter.createCaller(createContext(2)).files.signedUrl({ fileId: "evidence-1" });
    expect(result.url).toContain("signed/proof-1");
    expect(mocks.createPrivateSignedUrl).toHaveBeenCalledWith({ bucket: "smart-warga-private", path: "campaign-evidence/org-1/1/proof.png", expiresInSeconds: 300 });
  });

  it("denies an outsider from private campaign evidence", async () => {
    const target = { file: { id: "evidence-2", ownerId: 1, visibility: "private", bucket: "smart-warga-private", path: "campaign-evidence/org-1/1/proof.png" }, organizationId: null };
    const fileQuery = { from: vi.fn(), leftJoin: vi.fn(), where: vi.fn(), limit: vi.fn().mockResolvedValue([target]) };
    fileQuery.from.mockReturnValue(fileQuery); fileQuery.leftJoin.mockReturnValue(fileQuery); fileQuery.where.mockReturnValue(fileQuery);
    const campaignQuery = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), limit: vi.fn().mockResolvedValue([{ organizationId: "org-1" }]) };
    campaignQuery.from.mockReturnValue(campaignQuery); campaignQuery.innerJoin.mockReturnValue(campaignQuery); campaignQuery.where.mockReturnValue(campaignQuery);
    mocks.getDb.mockResolvedValue({ select: vi.fn().mockReturnValueOnce(fileQuery).mockReturnValueOnce(campaignQuery) });
    mocks.getUserOrganizations.mockResolvedValue([]);
    await expect(appRouter.createCaller(createContext(3)).files.signedUrl({ fileId: "evidence-2" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createPrivateSignedUrl).not.toHaveBeenCalled();
  });

  it("denies an outsider without an authorized organization role", async () => {
    mocks.getDb.mockResolvedValue(dbForFile(1, "org-1"));
    mocks.getUserOrganizations.mockResolvedValue([]);
    await expect(appRouter.createCaller(createContext(3)).files.signedUrl({ fileId: "proof-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createPrivateSignedUrl).not.toHaveBeenCalled();
  });
});
