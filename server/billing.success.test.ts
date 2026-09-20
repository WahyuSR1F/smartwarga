import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getUserOrganizations: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, getUserOrganizations: mocks.getUserOrganizations, logAudit: vi.fn() }));

import { appRouter } from "./routers";

function context() {
  return { user: { id: 1, openId: "billing-success", name: "Tester", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as never, res: {} as never };
}

function chain(result: unknown[] = []) {
  const value: any = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), offset: vi.fn(), values: vi.fn(), returning: vi.fn(), onConflictDoUpdate: vi.fn(), onConflictDoNothing: vi.fn(), set: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  for (const method of ["from", "innerJoin", "where", "orderBy", "offset", "values", "onConflictDoUpdate", "onConflictDoNothing", "set"]) value[method].mockReturnValue(value);
  value.limit.mockResolvedValue(result);
  value.returning.mockResolvedValue(result);
  return value;
}

function dbFor(results: unknown[][]) {
  let selectCount = 0;
  const db: any = {
    select: vi.fn(() => chain(results[selectCount++] ?? [])),
    insert: vi.fn(() => chain([{ id: "created-1", organizationId: "org-1", name: "Iuran Air", code: "air", defaultAmount: 15000 }])),
    update: vi.fn(() => chain()),
  };
  return db;
}

describe("billing success paths", () => {
  beforeEach(() => {
    mocks.getDb.mockReset();
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "organization_admin", status: "active", scopeType: "organization", scopeId: null } }]);
  });

  it("creates a category after scoped authorization", async () => {
    mocks.getDb.mockResolvedValue(dbFor([]));
    const result = await appRouter.createCaller(context()).billing.createType({ organizationId: "org-1", name: "Iuran Air", code: "air", defaultAmount: 15000, unit: "household" });
    expect(result).toMatchObject({ id: "created-1", code: "air" });
  });

  it("creates a period and issues invoices from tenant-scoped records", async () => {
    mocks.getDb.mockResolvedValue(dbFor([[{ id: "type-1", organizationId: "org-1", active: true, defaultAmount: 15000 }]]));
    const caller = appRouter.createCaller(context());
    const period = await caller.billing.createPeriod({ organizationId: "org-1", billingTypeId: "type-1", periodKey: "2026-08", dueAt: Date.now() + 86_400_000 });
    expect(period).toMatchObject({ id: "created-1" });

    mocks.getDb.mockResolvedValue(dbFor([[{ period: { id: "period-1" }, type: { defaultAmount: 15000 } }], [{ id: "home-1" }, { id: "home-2" }]]));
    const issued = await caller.billing.issueInvoices({ organizationId: "org-1", billingPeriodId: "period-1" });
    expect(issued).toEqual({ success: true, count: 2 });
  });
});
