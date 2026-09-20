import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn(), getDb: vi.fn() }));
const { authenticateRequest, getDb } = mocks;
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./whatsapp", () => ({ sendWhatsAppTemplate: vi.fn() }));

import { eventReminderHandler } from "./scheduled";

describe("event reminder handler", () => {
  beforeEach(async () => {
    authenticateRequest.mockReset();
    getDb.mockReset();
    const whatsapp = await import("./whatsapp");
    vi.mocked(whatsapp.sendWhatsAppTemplate).mockReset();
  });

  it("rejects requests that are not Heartbeat cron calls", async () => {
    authenticateRequest.mockResolvedValue({ isCron: false });
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json };

    await eventReminderHandler({} as never, res as never);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "cron-only" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns a service-unavailable response when the database is missing", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-1" });
    getDb.mockResolvedValue(null);
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json };

    await eventReminderHandler({} as never, res as never);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ error: "database-unavailable" });
  });

  it("records successful delivery once when no duplicate exists", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-1" });
    const rule = { rule: { id: "rule-1", enabled: true, templateName: "event_reminder" }, event: { id: "event-1", title: "Kerja bakti", startsAt: Date.now() } };
    const recipient = { user: { id: 7, phone: "+62 812 0000" } };
    let selectCount = 0;
    const db = {
      select: vi.fn(() => {
        selectCount += 1;
        const result = selectCount === 1 ? [rule] : selectCount === 2 ? [recipient] : [];
        const chain: any = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), limit: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
        chain.from.mockReturnValue(chain);
        chain.innerJoin.mockReturnValue(chain);
        chain.where.mockReturnValue(chain);
        chain.limit.mockResolvedValue(result);
        return chain;
      }),
      insert: vi.fn(() => ({ values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([{ id: "notification-1" }]) })),
      update: vi.fn(() => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) })),
    };
    getDb.mockResolvedValue(db);
    const whatsapp = await import("./whatsapp");
    vi.mocked(whatsapp.sendWhatsAppTemplate).mockResolvedValue({ providerMessageId: "provider-1" });
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json };

    await eventReminderHandler({} as never, res as never);

    expect(json).toHaveBeenCalledWith({ ok: true, eventId: "event-1", sent: 1 });
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it("skips sending when a notification for the same event and recipient already exists", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-1" });
    const rule = { rule: { id: "rule-1", enabled: true, templateName: "event_reminder" }, event: { id: "event-1", title: "Kerja bakti", startsAt: Date.now() } };
    const recipient = { user: { id: 7, phone: "+62 812 0000" } };
    let selectCount = 0;
    const db = {
      select: vi.fn(() => {
        selectCount += 1;
        const result = selectCount === 1 ? [rule] : selectCount === 2 ? [recipient] : [{ id: "existing-notification" }];
        const chain: any = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), limit: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
        chain.from.mockReturnValue(chain);
        chain.innerJoin.mockReturnValue(chain);
        chain.where.mockReturnValue(chain);
        chain.limit.mockResolvedValue(result);
        return chain;
      }),
      insert: vi.fn(),
      update: vi.fn(),
    };
    getDb.mockResolvedValue(db);
    const whatsapp = await import("./whatsapp");
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json };

    await eventReminderHandler({} as never, res as never);

    expect(json).toHaveBeenCalledWith({ ok: true, eventId: "event-1", sent: 0 });
    expect(db.insert).not.toHaveBeenCalled();
    expect(whatsapp.sendWhatsAppTemplate).not.toHaveBeenCalled();
  });
});
