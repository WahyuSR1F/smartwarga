import { beforeEach, describe, expect, it, vi } from "vitest";

const getDb = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getDb }));

import { appRouter } from "./routers";

function caller() {
  return appRouter.createCaller({ user: { id: 7, openId: "history-test", name: "Tester", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });
}

describe("payment status history", () => {
  beforeEach(() => getDb.mockReset());

  it("returns the resident timeline with invoice, payment, type, and period context", async () => {
    const historyRow = { history: { id: "history-1", status: "verified", note: "Diterima" }, invoice: { id: "invoice-1", amount: 15000 }, payment: { id: "payment-1" }, typeName: "Iuran Air", periodKey: "2026-08" };
    const query: any = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn() };
    query.from.mockReturnValue(query);
    query.innerJoin.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockResolvedValue([historyRow]);
    getDb.mockResolvedValue({ select: vi.fn().mockReturnValue(query) });

    await expect(caller().billing.myPaymentHistory()).resolves.toEqual([historyRow]);
  });
});
