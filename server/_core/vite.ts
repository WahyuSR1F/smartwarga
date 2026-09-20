import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { composeSsrHtml, injectServerSeo } from "./seo";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/entry-client.tsx"`,
        `src="/src/entry-client.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      const ssrModule = await vite.ssrLoadModule("/src/entry-server.tsx") as { render: (requestUrl: string) => Promise<{ html: string; dehydratedState: unknown }> };
      const rendered = await ssrModule.render(url);
      res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(composeSsrHtml(page, url, rendered));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (_req, res) => {
    const templatePath = path.resolve(distPath, "index.html");
    try {
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const ssrModule = await import(path.resolve(process.cwd(), "dist/server/entry-server.js")) as { render: (requestUrl: string) => Promise<{ html: string; dehydratedState: unknown }> };
      const rendered = await ssrModule.render(_req.originalUrl);
      res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).send(composeSsrHtml(template, _req.originalUrl, rendered));
    } catch (error) {
      console.error("[SSR] render failed", error);
      try {
        const template = await fs.promises.readFile(templatePath, "utf-8");
        res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).send(injectServerSeo(template, _req.originalUrl));
      } catch {
        res.sendFile(templatePath);
      }
    }
  });
}
