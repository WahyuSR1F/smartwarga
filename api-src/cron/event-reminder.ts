import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../server/db";
import { runDueEventReminders } from "../../server/eventReminders";

/**
 * Vercel Cron entry for event reminders (runs every 5 minutes). The Heartbeat
 * scheduler does not exist on Vercel, so this scans enabled rules and sends
 * only those whose scheduled time is due; per-recipient dedup in the shared
 * logic prevents duplicate WhatsApp messages within the window.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization ?? "";
  const urlToken = typeof req.query.token === "string" ? req.query.token : undefined;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}` && urlToken !== process.env.CRON_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "database-unavailable" });
    return;
  }

  const result = await runDueEventReminders();
  res.json({ ok: true, ...result });
}
