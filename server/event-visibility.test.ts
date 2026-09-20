import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getUserOrganizations: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, getUserOrganizations: mocks.getUserOrganizations, logAudit: vi.fn() }));

import { appRouter } from "./routers";

function context(userId: number) {
  return { user: { id: userId, openId: `event-visibility-${userId}`, name: "Warga", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };
}

function eventDb() {
  const query: any = { from: vi.fn(), leftJoin: vi.fn(), where: vi.fn(), groupBy: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), offset: vi.fn() };
  query.from.mockReturnValue(query);
  query.leftJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.groupBy.mockReturnValue(query);
  query.orderBy.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.offset.mockResolvedValue([]);
  return { select: vi.fn().mockReturnValue(query), query };
}

describe("event listing visibility", () => {
  it("uses a narrower published-only scope for residents than managers", async () => {
    const db = eventDb();
    mocks.getDb.mockResolvedValue(db);

    mocks.getUserOrganizations.mockResolvedValueOnce([{ organization: { id: "org-1" }, membership: { role: "resident", status: "active" } }]);
    await appRouter.createCaller(context(1)).events.list({ organizationId: "org-1" });
    const residentScope = db.query.where.mock.calls[0]?.[0];

    mocks.getUserOrganizations.mockResolvedValueOnce([{ organization: { id: "org-1" }, membership: { role: "rw_admin", status: "active" } }]);
    await appRouter.createCaller(context(2)).events.list({ organizationId: "org-1" });
    const managerScope = db.query.where.mock.calls[1]?.[0];

    expect(residentScope).toBeDefined();
    expect(managerScope).toBeDefined();
    expect(residentScope).not.toEqual(managerScope);
  });
});
