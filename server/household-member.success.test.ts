import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getUserOrganizations: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: mocks.getDb,
  getUserOrganizations: mocks.getUserOrganizations,
  logAudit: mocks.logAudit,
  getOrganizationSummary: vi.fn(),
  searchOrganizationResidents: vi.fn(),
}));

import { appRouter } from "./routers";

const context = () => ({
  user: {
    id: 7,
    openId: "household-manager",
    name: "Household Manager",
    email: null,
    loginMethod: "test",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as never,
  res: {} as never,
});

describe("household member upsert success", () => {
  beforeEach(() => {
    mocks.getUserOrganizations.mockReset();
    mocks.getDb.mockReset();
    mocks.logAudit.mockReset();
    mocks.getUserOrganizations.mockResolvedValue([
      { organization: { id: "org-1" }, membership: { role: "organization_admin", status: "active" } },
    ]);
  });

  it("upserts a tenant-scoped member and records the audit event", async () => {
    const selectChain: any = {
      from: vi.fn(),
      innerJoin: vi.fn(),
      where: vi.fn(),
      limit: vi.fn().mockResolvedValue([{ household: { id: "household-1" } }]),
    };
    selectChain.from.mockReturnValue(selectChain);
    selectChain.innerJoin.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);

    const createdMember = {
      householdId: "household-1",
      userId: 12,
      relationship: "Anak",
      isHead: false,
    };
    const insertChain: any = {
      values: vi.fn(),
      onConflictDoUpdate: vi.fn(),
      returning: vi.fn().mockResolvedValue([createdMember]),
    };
    insertChain.values.mockReturnValue(insertChain);
    insertChain.onConflictDoUpdate.mockReturnValue(insertChain);

    mocks.getDb.mockResolvedValue({
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue(insertChain),
    });

    const result = await appRouter.createCaller(context()).households.addMember({
      organizationId: "org-1",
      householdId: "household-1",
      userId: 12,
      relationship: "Anak",
      isHead: false,
    });

    expect(result).toEqual(createdMember);
    expect(insertChain.values).toHaveBeenCalledWith({
      householdId: "household-1",
      userId: 12,
      relationship: "Anak",
      isHead: false,
    });
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ relationship: "Anak", isHead: false }),
      }),
    );
    expect(mocks.logAudit).toHaveBeenCalledWith({
      actorId: 7,
      action: "household_member_upsert",
      resource: "household",
      resourceId: "household-1",
      metadata: { organizationId: "org-1", userId: 12 },
    });
  });
});
