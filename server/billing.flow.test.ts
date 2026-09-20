import { describe, expect, it } from "vitest";
import { vi } from "vitest";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn().mockResolvedValue(null) }));
vi.mock("./db", async importOriginal => ({ ...(await importOriginal<typeof import("./db")>()), getDb }));

import { appRouter } from "./routers";

function caller() {
  return appRouter.createCaller({
    user: { id: 1, openId: "billing-test", name: "Tester", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as never,
    res: {} as never,
  });
}

describe("billing flows", () => {
  it("returns truthful empty states for an empty copied database", async () => {
    const result = await caller().billing.myInvoices();
    const history = await caller().billing.myPaymentHistory();
    expect(result).toEqual([]);
    expect(history).toEqual([]);
  });

  it("rejects malformed category and period inputs before any database call", async () => {
    await expect(caller().billing.createType({ organizationId: "org-1", name: "A", code: "INVALID CODE", defaultAmount: -1, unit: "household" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().billing.createPeriod({ organizationId: "org-1", billingTypeId: "type-1", periodKey: "2026-13", dueAt: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().billing.issueInvoices({ organizationId: "", billingPeriodId: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
