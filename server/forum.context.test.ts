import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getUserOrganizations: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, getUserOrganizations: mocks.getUserOrganizations, logAudit: vi.fn() }));

import { appRouter } from "./routers";

const ctx = { user: { id: 4, openId: "forum-context", name: "Moderator", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };

describe("forum contextual topics", () => {
  beforeEach(() => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "resident", status: "active" } }]);
    const insert = vi.fn(() => { const chain: any = { values: vi.fn(), returning: vi.fn() }; chain.values.mockImplementation((values: any) => { chain.returning.mockResolvedValue([{ id: "topic-1", ...values }]); return chain; }); return chain; });
    mocks.getDb.mockResolvedValue({ insert });
  });

  it.each([
    ["campaign", "campaign-1"],
    ["event", "event-1"],
    ["announcement", "announcement-1"],
  ] as const)("stores the selected %s context", async (scopeType, scopeId) => {
    const result = await appRouter.createCaller(ctx).forum.createTopic({ organizationId: "org-1", title: `Pembaruan ${scopeType}`, scopeType, scopeId });
    expect(result).toMatchObject({ scopeType, scopeId });
  });

  it("lists linked topics with their scope metadata", async () => {
    const query: any = { from: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), offset: vi.fn() };
    query.from.mockReturnValue(query); query.where.mockReturnValue(query); query.orderBy.mockReturnValue(query); query.limit.mockReturnValue(query); query.offset.mockResolvedValue([{ id: "topic-2", scopeType: "event", scopeId: "event-1" }, { id: "topic-3", scopeType: "announcement", scopeId: "announcement-1" }]);
    mocks.getDb.mockResolvedValue({ select: vi.fn().mockReturnValue(query) });
    const result = await appRouter.createCaller(ctx).forum.listTopics({ organizationId: "org-1", limit: 20, offset: 0 });
    expect(result).toHaveLength(2);
    expect(result.map(topic => topic.scopeType)).toEqual(["event", "announcement"]);
  });
});
