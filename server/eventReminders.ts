import { and, eq } from "drizzle-orm";
import { eventRegistrations, eventReminderRules, events, notificationDeliveries, notifications, users } from "../drizzle/schema";
import { getDb } from "./db";
import { sendWhatsAppTemplate } from "./whatsapp";

/** Tolerance around the scheduled reminder time (Vercel Cron runs every 5 min). */
const DUE_WINDOW_MS = 10 * 60_000;

type ReminderSendOutcome = { ok: true; eventId: string; sent: number } | { ok: true; skipped: string };

async function runReminderForRule(
  rule: { id: string; enabled: boolean; templateName: string; minutesBefore: number },
  event: { id: string; title: string; startsAt: Date },
  taskUid: string | null,
  respectWindow: boolean,
): Promise<ReminderSendOutcome> {
  if (!rule.enabled) return { ok: true, skipped: "disabled" };

  if (respectWindow) {
    // Scan mode (Vercel Cron): only fire within the window around
    // (startsAt - minutesBefore). Per-recipient dedup below prevents double
    // sends inside the window.
    const startsAtMs = new Date(event.startsAt).getTime();
    const scheduledAt = startsAtMs - (rule.minutesBefore ?? 0) * 60_000;
    const now = Date.now();
    if (now < scheduledAt - DUE_WINDOW_MS || now > scheduledAt + DUE_WINDOW_MS) {
      return { ok: true, skipped: "not-due" };
    }
  }

  const db = await getDb();
  if (!db) return { ok: true, skipped: "database-unavailable" };

  const registrations = await db.select({ user: users }).from(eventRegistrations).innerJoin(users, eq(users.id, eventRegistrations.userId)).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, "registered")));
  let sent = 0;
  for (const { user: recipient } of registrations) {
    const entityId = `${event.id}:${rule.id}:${recipient.id}`;
    const existing = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.entityType, "event_reminder"), eq(notifications.entityId, entityId))).limit(1);
    if (existing[0]) continue;
    const notification = (await db.insert(notifications).values({ recipientId: recipient.id, channel: "whatsapp", template: rule.templateName, entityType: "event_reminder", entityId, status: "queued" }).returning())[0];
    try {
      if (!recipient.phone) throw new Error("Recipient phone is missing");
      const to = recipient.phone.replace(/\D/g, "");
      const result = await sendWhatsAppTemplate({ to, templateName: rule.templateName, parameters: [{ type: "text", text: event.title }, { type: "text", text: new Date(event.startsAt).toLocaleString("id-ID") }] });
      if (notification) {
        await db.update(notifications).set({ status: "sent", updatedAt: new Date() }).where(eq(notifications.id, notification.id));
        await db.insert(notificationDeliveries).values({ notificationId: notification.id, providerMessageId: result.providerMessageId, status: "accepted", payload: JSON.stringify({ taskUid }) });
      }
      sent += 1;
    } catch (error) {
      if (notification) await db.update(notifications).set({ status: "failed", updatedAt: new Date() }).where(eq(notifications.id, notification.id));
      console.warn("[Reminder] Event reminder failed", { recipientId: recipient.id, error: String(error) });
    }
  }
  return { ok: true, eventId: event.id, sent };
}

/**
 * Heartbeat path (persistent server): a per-event cron fires exactly once at
 * the scheduled time, so no window check — a delayed fire still sends.
 */
export async function runEventReminderBatch(taskUid: string): Promise<{ ok: false; status: 503; error: string } | { ok: true; payload: ReminderSendOutcome }> {
  const db = await getDb();
  if (!db) return { ok: false, status: 503, error: "database-unavailable" };
  const rule = (await db.select({ rule: eventReminderRules, event: events }).from(eventReminderRules).innerJoin(events, eq(events.id, eventReminderRules.eventId)).where(eq(eventReminderRules.scheduleCronTaskUid, taskUid)).limit(1))[0];
  if (!rule) return { ok: true, payload: { ok: true, skipped: "orphan" } };
  const payload = await runReminderForRule(rule.rule, rule.event, taskUid, false);
  return { ok: true, payload };
}

/**
 * Vercel Cron path: no per-event scheduler exists, so scan every enabled rule
 * and send only the ones whose scheduled time falls inside the current window.
 */
export async function runDueEventReminders(): Promise<{ processed: number; sent: number; skipped: number }> {
  const db = await getDb();
  if (!db) return { processed: 0, sent: 0, skipped: 0 };
  const rows = await db.select({ rule: eventReminderRules, event: events }).from(eventReminderRules).innerJoin(events, eq(events.id, eventReminderRules.eventId)).where(eq(eventReminderRules.enabled, true));
  let processed = 0;
  let sent = 0;
  let skipped = 0;
  for (const row of rows) {
    const outcome = await runReminderForRule(row.rule, row.event, null, true);
    if (outcome.ok && "eventId" in outcome) {
      processed += 1;
      sent += outcome.sent;
    } else {
      skipped += 1;
    }
  }
  return { processed, sent, skipped };
}
