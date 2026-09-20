import { describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getUserOrganizations: vi.fn().mockResolvedValue([]) };
});
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "resident-test",
      name: "Resident Test",
      email: "resident@example.com",
      phone: null,
      loginMethod: "test",
      role: "resident",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("community tenant access", () => {
  it("denies summary access when the user is not an active organization member", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.community.summary({ organizationId: "org-not-assigned" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies billing category creation before touching tenant data", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.billing.createType({ organizationId: "org-not-assigned", name: "Air", code: "air", defaultAmount: 15000, unit: "household" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unsafe billing category codes at the contract boundary", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.billing.createType({ organizationId: "org-not-assigned", name: "Air", code: "Air Bersama", defaultAmount: 15000, unit: "household" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("denies payment review access when the user is not an active treasurer member", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.billing.listPending({ organizationId: "org-not-assigned" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies moderation actions when the user is not an active admin member", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.forum.reviewReport({ organizationId: "org-not-assigned", reportId: "report-1", status: "dismissed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
