import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import { QueryClient, QueryClientProvider, dehydrate } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import App from "./App";

export async function render(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  const questionMark = url.indexOf("?");
  const ssrPath = questionMark === -1 ? url : url.slice(0, questionMark);
  const ssrSearch = questionMark === -1 ? "" : url.slice(questionMark + 1);
  const trpcClient = trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })] });
  const html = await new Promise<string>((resolve, reject) => {
    let didError = false;
    const output = new PassThrough();
    let html = "";
    output.on("data", chunk => { html += chunk.toString(); });
    output.on("end", () => { if (didError) reject(new Error("SSR rendering failed")); else resolve(html); });
    const { pipe } = renderToPipeableStream(
      <trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><App ssrPath={ssrPath} ssrSearch={ssrSearch} /></QueryClientProvider></trpc.Provider>,
      {
        onAllReady: () => pipe(output),
        onShellError: error => reject(error),
        onError: error => { didError = true; console.error("[SSR] Rendering error:", error); },
      },
    );
  });
  return { html, dehydratedState: dehydrate(queryClient) };
}
