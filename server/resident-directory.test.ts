import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getUserOrganizations: vi.fn(), searchOrganizationResidents: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, getUserOrganizations: mocks.getUserOrganizations, searchOrganizationResidents: mocks.searchOrganizationResidents }));

import { appRouter } from "./routers";
import { pageAfterResidentQueryChange, residentPageOffset } from "../client/src/lib/resident-directory";
import { householdMemberSuccessState } from "../client/src/lib/household-members";

const ctx = { user: { id: 9, openId: "directory-user", name: "Directory User", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };

describe("resident directory", () => {
  beforeEach(() => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "resident", status: "active" } }]);
  });

  it("forwards first, next, and previous page offsets", async () => {
    mocks.searchOrganizationResidents.mockResolvedValue([]);
    const caller = appRouter.createCaller(ctx);
    for (const offset of [0, 20, 0]) await caller.community.residents({ organizationId: "org-1", query: "Sari", limit: 20, offset });
    expect(mocks.searchOrganizationResidents.mock.calls.slice(-3).map(call => call[3])).toEqual([0, 20, 0]);
  });

  it("clears the selected resident after a successful household-member upsert", () => {
    expect(householdMemberSuccessState()).toEqual({ userId: "" });
  });

  it("resets the UI page when the search query changes and keeps offsets safe", () => {
    expect(pageAfterResidentQueryChange()).toBe(0);
    expect(residentPageOffset(0)).toBe(0);
    expect(residentPageOffset(2)).toBe(40);
    expect(residentPageOffset(-1)).toBe(0);
  });

  it("returns tenant-scoped search results through the requested page", async () => {
    const rows = [{ user: { id: 21, name: "Sari", createdAt: new Date() }, membership: { organizationId: "org-1", userId: 21, role: "resident" } }];
    mocks.searchOrganizationResidents.mockResolvedValue(rows);
    const result = await appRouter.createCaller(ctx).community.residents({ organizationId: "org-1", query: "Sari", limit: 20, offset: 20 });
    expect(result).toEqual(rows);
    expect(mocks.searchOrganizationResidents).toHaveBeenCalledWith("org-1", "Sari", 20, 20);
  });
});
