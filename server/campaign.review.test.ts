import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getUserOrganizations: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, getUserOrganizations: mocks.getUserOrganizations, logAudit: vi.fn() }));

import { appRouter } from "./routers";

const context = (id: number) => ({ user: { id, openId: `campaign-review-${id}`, name: "Reviewer", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });

describe("campaign donation review", () => {
  beforeEach(() => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "treasurer", status: "active" } }]);
  });

  it("creates a tenant-scoped campaign draft for an authorized administrator", async () => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "rw_admin", status: "active" } }]);
    const query: any = { from: vi.fn(), where: vi.fn(), limit: vi.fn().mockResolvedValue([]) }; query.from.mockReturnValue(query); query.where.mockReturnValue(query);
    const created = { id: "campaign-1", organizationId: "org-1", title: "Bakti warga", slug: "bakti-warga", status: "draft" };
    const insertChain: any = { values: vi.fn(), returning: vi.fn().mockResolvedValue([created]) }; insertChain.values.mockReturnValue(insertChain);
    mocks.getDb.mockResolvedValue({ select: vi.fn().mockReturnValue(query), insert: vi.fn().mockReturnValue(insertChain) });
    await expect(appRouter.createCaller(context(1)).campaigns.create({ organizationId: "org-1", title: "Bakti warga", slug: "bakti-warga", targetAmount: 5000000 })).resolves.toMatchObject(created);
    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", status: "draft" }));
  });

  it("rejects a duplicate campaign slug within the tenant", async () => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "rw_admin", status: "active" } }]);
    const query: any = { from: vi.fn(), where: vi.fn(), limit: vi.fn().mockResolvedValue([{ id: "existing" }]) }; query.from.mockReturnValue(query); query.where.mockReturnValue(query);
    const insert = vi.fn(); mocks.getDb.mockResolvedValue({ select: vi.fn().mockReturnValue(query), insert });
    await expect(appRouter.createCaller(context(1)).campaigns.create({ organizationId: "org-1", title: "Bakti warga", slug: "bakti-warga", targetAmount: 5000000 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("publishes a campaign only within the authorized tenant", async () => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "rw_admin", status: "active" } }]);
    const updateChain: any = { set: vi.fn(), where: vi.fn(), returning: vi.fn().mockResolvedValue([{ id: "campaign-1", organizationId: "org-1", status: "published" }]) }; updateChain.set.mockReturnValue(updateChain); updateChain.where.mockReturnValue(updateChain);
    mocks.getDb.mockResolvedValue({ update: vi.fn().mockReturnValue(updateChain) });
    await expect(appRouter.createCaller(context(1)).campaigns.publish({ organizationId: "org-1", campaignId: "campaign-1" })).resolves.toMatchObject({ status: "published" });
  });

  it("denies campaign creation to residents", async () => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "resident", status: "active" } }]);
    await expect(appRouter.createCaller(context(2)).campaigns.create({ organizationId: "org-1", title: "Bakti warga", slug: "bakti-warga", targetAmount: 5000000 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns submitted contributions for an authorized reviewer", async () => {
    const rows = [{ donation: { id: "donation-1", amount: 25000, status: "submitted" }, campaign: { id: "campaign-1", title: "Bakti warga" }, donor: { id: 7, name: "Sari", email: null } }];
    const query: any = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), orderBy: vi.fn() };
    query.from.mockReturnValue(query); query.innerJoin.mockReturnValue(query); query.where.mockReturnValue(query); query.orderBy.mockResolvedValue(rows);
    mocks.getDb.mockResolvedValue({ select: vi.fn().mockReturnValue(query) });
    await expect(appRouter.createCaller(context(1)).campaigns.pending({ organizationId: "org-1" })).resolves.toEqual(rows);
  });

  it.each(["verified", "rejected"] as const)("updates a submitted contribution to %s", async status => {
    const query: any = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), limit: vi.fn() };
    query.from.mockReturnValue(query); query.innerJoin.mockReturnValue(query); query.where.mockReturnValue(query); query.limit.mockResolvedValue([{ donation: { id: "donation-1" }, campaign: { organizationId: "org-1" } }]);
    const updateChain: any = { set: vi.fn(), where: vi.fn() }; updateChain.set.mockReturnValue(updateChain); updateChain.where.mockResolvedValue({});
    mocks.getDb.mockResolvedValue({ select: vi.fn().mockReturnValue(query), update: vi.fn().mockReturnValue(updateChain) });
    await expect(appRouter.createCaller(context(1)).campaigns.verifyDonation({ organizationId: "org-1", donationId: "donation-1", status })).resolves.toEqual({ success: true, status });
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status }));
  });

  it("denies a wrong-tenant verification request before touching data", async () => {
    await expect(appRouter.createCaller(context(1)).campaigns.verifyDonation({ organizationId: "org-2", donationId: "donation-1", status: "verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies donation verification to an outsider without membership", async () => {
    mocks.getUserOrganizations.mockResolvedValue([]);
    await expect(appRouter.createCaller(context(3)).campaigns.verifyDonation({ organizationId: "org-1", donationId: "donation-1", status: "verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies pending contribution access to residents", async () => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "resident", status: "active" } }]);
    await expect(appRouter.createCaller(context(2)).campaigns.pending({ organizationId: "org-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
