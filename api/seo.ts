import fs from "node:fs";
import path from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { injectServerSeo } from "../server/_core/seo";

/**
 * SEO shell handler for Vercel. Full SSR (React streaming) is not available on
 * serverless, so this injects the same per-route head metadata (title,
 * description, canonical, OG, JSON-LD) into the built index.html shell — the
 * identical fallback path already used by the persistent server.
 */
let cachedTemplate: string | null = null;

function readShellTemplate(): string {
  if (!cachedTemplate) {
    const candidates = [
      path.join(process.cwd(), "dist", "public", "index.html"),
      path.join(process.cwd(), "..", "dist", "public", "index.html"),
      path.join(__dirname, "..", "dist", "public", "index.html"),
    ];
    for (const candidate of candidates) {
      try {
        cachedTemplate = fs.readFileSync(candidate, "utf8");
        break;
      } catch {
        // try the next candidate location
      }
    }
    if (!cachedTemplate) throw new Error("index.html shell not found");
  }
  return cachedTemplate;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestUrl = `https://${req.headers.host}${req.url}`;

  try {
    res.status(200);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.send(injectServerSeo(readShellTemplate(), requestUrl));
  } catch {
    res.status(500).send("Shell template unavailable");
  }
}
