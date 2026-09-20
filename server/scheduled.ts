import type { Request, Response } from "express";
import { runEventReminderBatch } from "./eventReminders";
import { sdk } from "./_core/sdk";

export async function eventReminderHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await runEventReminderBatch(user.taskUid);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.json(result.payload);
  } catch (error) {
    console.error("[Heartbeat] Event reminder handler failed", error);
    return res.status(500).json({ error: String(error), context: { taskUid: (req as Request & { user?: { taskUid?: string } }).user?.taskUid ?? null }, timestamp: new Date().toISOString() });
  }
}
