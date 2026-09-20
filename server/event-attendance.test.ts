import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getUserOrganizations: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, getUserOrganizations: mocks.getUserOrganizations, logAudit: vi.fn() }));

import { appRouter } from "./routers";

function context(userId: number) {
  return { user: { id: userId, openId: `attendance-${userId}`, name: "Warga", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };
}

function eventDb(status: "published" | "draft" = "published", capacity?: number, registered = 0, existingStatus?: "registered" | "cancelled") {
  const eventQuery: any = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), limit: vi.fn() };
  eventQuery.from.mockReturnValue(eventQuery);
  eventQuery.innerJoin.mockReturnValue(eventQuery);
  eventQuery.where.mockReturnValue(eventQuery);
  eventQuery.limit.mockResolvedValue([{ id: "event-1", organizationId: "org-1", status, capacity }]);
  const countQuery: any = { from: vi.fn(), where: vi.fn() };
  countQuery.from.mockReturnValue(countQuery);
  countQuery.where.mockResolvedValue([{ value: registered }]);
  const existingQuery: any = { from: vi.fn(), where: vi.fn(), limit: vi.fn() };
  existingQuery.from.mockReturnValue(existingQuery);
  existingQuery.where.mockReturnValue(existingQuery);
  existingQuery.limit.mockResolvedValue(existingStatus ? [{ status: existingStatus }] : []);
  const mutation: any = { values: vi.fn(), onConflictDoUpdate: vi.fn(), returning: vi.fn() };
  mutation.values.mockReturnValue(mutation);
  mutation.onConflictDoUpdate.mockReturnValue(mutation);
  mutation.returning.mockResolvedValue([{ id: "registration-1", eventId: "event-1", userId: 7, status: "registered" }]);
  let selectCount = 0;
  const select = vi.fn().mockImplementation(() => {
    selectCount += 1;
    return selectCount === 1 ? eventQuery : selectCount === 2 ? countQuery : existingQuery;
  });
  return { select, insert: vi.fn().mockReturnValue(mutation) };
}

describe("event attendance registration", () => {
  beforeEach(() => {
    mocks.getDb.mockReset();
    mocks.getUserOrganizations.mockReset();
  });

  it("registers an active resident for a published event in their organization", async () => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "resident", status: "active" } }]);
    mocks.getDb.mockResolvedValue(eventDb());
    const result = await appRouter.createCaller(context(7)).events.register({ eventId: "event-1" });
    expect(result).toMatchObject({ eventId: "event-1", status: "registered" });
  });

  it("rejects registration for an unpublished event", async () => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "resident", status: "active" } }]);
    mocks.getDb.mockResolvedValue(eventDb("draft"));
    await expect(appRouter.createCaller(context(7)).events.register({ eventId: "event-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a new registration when the event is full", async () => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "resident", status: "active" } }]);
    mocks.getDb.mockResolvedValue(eventDb("published", 1, 1));
    await expect(appRouter.createCaller(context(7)).events.register({ eventId: "event-1" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("allows an already registered attendee to re-submit idempotently when full", async () => {
    mocks.getUserOrganizations.mockResolvedValue([{ organization: { id: "org-1" }, membership: { role: "resident", status: "active" } }]);
    mocks.getDb.mockResolvedValue(eventDb("published", 1, 1, "registered"));
    const result = await appRouter.createCaller(context(7)).events.register({ eventId: "event-1" });
    expect(result).toMatchObject({ eventId: "event-1", status: "registered" });
  });

  it("rejects a resident outside the event organization", async () => {
    mocks.getUserOrganizations.mockResolvedValue([]);
    mocks.getDb.mockResolvedValue(eventDb());
    await expect(appRouter.createCaller(context(9)).events.register({ eventId: "event-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
