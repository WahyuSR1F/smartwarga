import { hydrateRoot } from "react-dom/client";
import { HydrationBoundary, QueryClient, QueryClientProvider, type DehydratedState } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { COOKIE_NAME } from "@shared/const";
import { trpc } from "@/lib/trpc";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          const prefix = `${COOKIE_NAME}=`;
          const token = raw?.split(";").find(s => s.trim().startsWith(prefix))?.trim().slice(prefix.length);
          return token ? { Authorization: `Bearer ${token}` } : {};
        } catch {
          return {};
        }
      },
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
      },
    }),
  ],
});

const rawState = (window as Window & { __RQ_STATE__?: string }).__RQ_STATE__;
const dehydratedState = rawState ? JSON.parse(rawState) as DehydratedState : undefined;

hydrateRoot(document.getElementById("root")!, <trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><HydrationBoundary state={dehydratedState}><App /></HydrationBoundary></QueryClientProvider></trpc.Provider>);
