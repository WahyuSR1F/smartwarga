import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { COOKIE_NAME } from "@shared/const";

const POLL_INTERVAL_MS = 10_000;

/** Serverless builds (Vercel) disable Socket.IO — polling only. */
const realtimeEnabled = import.meta.env.VITE_DISABLE_REALTIME !== "1";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io("/", {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }
  return socket;
}

function getAuthToken(): string | undefined {
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    if (!raw) return undefined;
    const prefix = `${COOKIE_NAME}=`;
    const pair = raw.split(";").find(item => item.trim().startsWith(prefix));
    return pair?.trim().slice(prefix.length) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Forum freshness strategy:
 *  - Persistent Node deploy: a shared Socket.IO connection joins the org room
 *    and invalidates forum queries the moment a neighbor posts.
 *  - Serverless deploy (e.g. Vercel, socket never connects): automatically
 *    falls back to a 10s React Query poll so discussions still stay fresh.
 */
export function useForumRealtime(organizationId: string | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) return;

    const invalidateForumQueries = () => {
      void queryClient.invalidateQueries({ queryKey: [["forum"]] });
    };

    let usingRealtime = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollTimer || usingRealtime) return;
      pollTimer = setInterval(invalidateForumQueries, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const onConnect = () => {
      client.emit("forum:join", { organizationId }, (response: { ok: boolean } | undefined) => {
        if (response && !response.ok) {
          client.disconnect();
          startPolling();
        }
      });
    };

    if (!realtimeEnabled) {
      startPolling();
      return () => stopPolling();
    }

    let client: Socket;
    try {
      client = getSocket();
    } catch {
      startPolling();
      return () => stopPolling();
    }

    if (client) {
      const onConnectError = () => startPolling();

      client.auth = { ...client.auth, token: getAuthToken() };
      client.on("connect", onConnect);
      client.on("connect_error", onConnectError);
      client.on("forum:new-topic", invalidateForumQueries);
      client.on("forum:new-post", invalidateForumQueries);
      if (client.connected) onConnect();
      else client.connect();

      // If the socket has not connected within 5s (blocked WS on serverless),
      // start the polling fallback without killing the retrying socket.
      const fallbackTimer = setTimeout(() => {
        if (!client.connected) startPolling();
      }, 5_000);

      return () => {
        clearTimeout(fallbackTimer);
        stopPolling();
        client.emit("forum:leave", { organizationId });
        client.off("connect", onConnect);
        client.off("connect_error", onConnectError);
        client.off("forum:new-topic", invalidateForumQueries);
        client.off("forum:new-post", invalidateForumQueries);
      };
    }

    return () => stopPolling();
  }, [organizationId, queryClient]);

}
