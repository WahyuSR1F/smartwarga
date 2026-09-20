import { describe, expect, it, vi } from "vitest";

const { getUserOrganizations, getDb } = vi.hoisted(() => ({ getUserOrganizations: vi.fn(), getDb: vi.fn().mockResolvedValue(null) }));
vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getUserOrganizations, getDb };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const roles = ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"] as const;
type Role = (typeof roles)[number];

function createContext(role: Role): TrpcContext {
  return {
    user: { id: 42, openId: `${role}-test`, name: `${role} Test`, email: `${role}@example.com`, phone: null, loginMethod: "test", role, status: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function allow(role: Role) {
  getUserOrganizations.mockResolvedValueOnce([{ organization: { id: "org-1" }, membership: { status: "active", role } }]);
}

describe("organization role matrix", () => {
  for (const role of roles) {
    it(`denies ${role} when no active membership exists`, async () => {
      getUserOrganizations.mockResolvedValueOnce([]);
      const caller = appRouter.createCaller(createContext(role));
      await expect(caller.community.summary({ organizationId: "org-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  }

  it("allows administrators to reach billing creation after membership validation", async () => {
    for (const role of ["platform_admin", "organization_admin", "rw_admin", "rt_admin"] as const) {
      allow(role);
      const caller = appRouter.createCaller(createContext(role));
      await expect(caller.billing.createType({ organizationId: "org-1", name: "Air", code: "air", defaultAmount: 15000, unit: "household" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    }
  });

  it("allows treasurers to reach payment review and rejects residents", async () => {
    allow("treasurer");
    const treasurer = appRouter.createCaller(createContext("treasurer"));
    await expect(treasurer.billing.listPending({ organizationId: "org-1" })).resolves.toEqual([]);
  });

  it("allows admins to reach forum report review and rejects residents", async () => {
    allow("organization_admin");
    const admin = appRouter.createCaller(createContext("organization_admin"));
    await expect(admin.forum.reviewReport({ organizationId: "org-1", reportId: "report-1", status: "dismissed" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });

    allow("resident");
    const resident = appRouter.createCaller(createContext("resident"));
    await expect(resident.forum.reviewReport({ organizationId: "org-1", reportId: "report-1", status: "dismissed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows residents to read tenant lists but not manage them", async () => {
    allow("resident");
    const resident = appRouter.createCaller(createContext("resident"));
    await expect(resident.billing.listTypes({ organizationId: "org-1" })).resolves.toEqual([]);

    allow("resident");
    await expect(resident.events.create({ organizationId: "org-1", title: "Acara warga", slug: "acara-warga", startsAt: Date.now() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("guards announcement create and publish by management roles", async () => {
    allow("organization_admin");
    const manager = appRouter.createCaller(createContext("organization_admin"));
    await expect(manager.announcements.create({ organizationId: "org-1", title: "Info warga", slug: "info-warga", body: "Informasi kegiatan warga." })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });

    allow("resident");
    const resident = appRouter.createCaller(createContext("resident"));
    await expect(resident.announcements.create({ organizationId: "org-1", title: "Info warga", slug: "info-warga", body: "Informasi kegiatan warga." })).rejects.toMatchObject({ code: "FORBIDDEN" });

    allow("organization_admin");
    await expect(manager.announcements.publish({ organizationId: "org-1", announcementId: "announcement-1" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });

    allow("resident");
    await expect(resident.announcements.publish({ organizationId: "org-1", announcementId: "announcement-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("guards event publication by management roles", async () => {
    for (const role of ["platform_admin", "organization_admin", "rw_admin", "rt_admin"] as const) {
      allow(role);
      const manager = appRouter.createCaller(createContext(role));
      await expect(manager.events.create({ organizationId: "org-1", title: "Acara warga", slug: `acara-${role.replace("_", "-")}`, startsAt: Date.now() })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    }

    allow("rt_admin");
    const manager = appRouter.createCaller(createContext("rt_admin"));
    await expect(manager.events.publish({ organizationId: "org-1", eventId: "event-1" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });

    allow("resident");
    const resident = appRouter.createCaller(createContext("resident"));
    await expect(resident.events.publish({ organizationId: "org-1", eventId: "event-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("guards household member management by area managers", async () => {
    allow("organization_admin");
    const manager = appRouter.createCaller(createContext("organization_admin"));
    await expect(manager.households.list({ organizationId: "org-1", limit: 10, offset: 0 })).resolves.toEqual([]);
    allow("organization_admin");
    await expect(manager.households.listMembers({ organizationId: "org-1", householdId: "home-1" })).resolves.toEqual([]);
    allow("organization_admin");
    await expect(manager.households.addMember({ organizationId: "org-1", householdId: "home-1", userId: 7, relationship: "Anak", isHead: false })).rejects.not.toMatchObject({ code: "FORBIDDEN" });

    allow("resident");
    const resident = appRouter.createCaller(createContext("resident"));
    await expect(resident.households.addMember({ organizationId: "org-1", householdId: "home-1", userId: 7, relationship: "Anak", isHead: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
