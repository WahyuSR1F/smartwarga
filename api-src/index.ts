import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

/**
 * Vercel serverless entry. Mirrors the API surface of the persistent server
 * (server/_core/index.ts) without WebSocket/HMR/static hosting — those are
 * handled by the Vercel platform.
 */
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);

app.get("/robots.txt", (_req, res) => {
  const origin = process.env.CANONICAL_ORIGIN ?? "";
  res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api\nSitemap: ${origin}/sitemap.xml\n`);
});

app.get("/sitemap.xml", (_req, res) => {
  const origin = process.env.CANONICAL_ORIGIN ?? "";
  const urls = ["/", "/wilayah/kampung-melati"].map(path => `${origin}${path}`);
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${url}</loc></url>`).join("")}</urlset>`);
});

app.get("/api/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && typeof challenge === "string") {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

app.get("/debug/env", (req, res) => {
  res.json({
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL ? "✓ (set)" : "✗ (NOT SET)",
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN ? "✓ (set)" : "✗ (NOT SET)",
    hasDatabaseUrl: !!process.env.TURSO_DATABASE_URL,
    hasAuthToken: !!process.env.TURSO_AUTH_TOKEN,
  });
});

app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

export default app;
