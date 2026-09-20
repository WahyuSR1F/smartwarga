import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { authenticateFromCookie, verifySessionToken } from "./auth";
import { getMembership } from "./_core/authorize";

let io: Server | null = null;

const forumRoom = (organizationId: string) => `forum:${organizationId}`;

export function initRealtime(server: HttpServer): Server {
  if (io) return io;
  // Serverless builds have no persistent HTTP server — WebSocket is disabled.
  if (process.env.DISABLE_REALTIME === "1") {
    io = null as unknown as Server;
    return null as unknown as Server;
  }

  io = new Server(server, {
    cors: { origin: true, credentials: true },
  });

  // Authenticate the handshake with the same session token used by tRPC
  // (Bearer from sessionStorage first, cookie as fallback).
  io.use(async (socket, next) => {
    try {
      let userId: number | null = null;

      const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : undefined;
      if (token) {
        const session = await verifySessionToken(token);
        if (session) {
          const db = await getDb();
          if (db) {
            const result = await db.select({ id: users.id }).from(users).where(eq(users.id, session.userId)).limit(1);
            userId = result[0]?.id ?? null;
          }
        }
      }

      if (!userId) {
        const cookieUser = await authenticateFromCookie(socket.handshake.headers.cookie);
        userId = cookieUser?.id ?? null;
      }

      if (!userId) {
        next(new Error("unauthorized"));
        return;
      }

      socket.data.userId = userId;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    socket.on("forum:join", async (payload: unknown, ack?: (response: { ok: boolean }) => void) => {
      const organizationId = (payload as { organizationId?: unknown } | null)?.organizationId;
      if (typeof organizationId !== "string" || !organizationId) {
        ack?.({ ok: false });
        return;
      }
      try {
        // Same access rule as forum.listTopics / forum.createPost: any active
        // member of the organization may follow discussions.
        const membership = await getMembership(socket.data.userId, organizationId);
        if (!membership) {
          ack?.({ ok: false });
          return;
        }
      } catch {
        ack?.({ ok: false });
        return;
      }
      await socket.join(forumRoom(organizationId));
      ack?.({ ok: true });
    });

    socket.on("forum:leave", (payload: unknown) => {
      const organizationId = (payload as { organizationId?: unknown } | null)?.organizationId;
      if (typeof organizationId === "string" && organizationId) {
        void socket.leave(forumRoom(organizationId));
      }
    });
  });

  return io;
}

export function getRealtimeServer(): Server | null {
  return io;
}

/** Broadcast a forum event to every member of the organization. */
export function emitForumEvent(
  organizationId: string,
  event: "forum:new-topic" | "forum:new-post",
  payload: Record<string, unknown>,
): void {
  if (!io) return;
  io.to(forumRoom(organizationId)).emit(event, payload);
}
