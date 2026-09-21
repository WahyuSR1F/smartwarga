import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const srcDir = path.join(root, "api-src");
const outDir = path.join(root, "api");

/**
 * Bundle each Vercel serverless entry (api-src/*.ts + api-src/cron/*.ts) into a
 * single self-contained .js file under api/. All project source under server/
 * is inlined, while npm packages are left external so the Vercel Node builder
 * can trace them.
 *
 * This eliminates ERR_MODULE_NOT_FOUND for ../server/_core/* at runtime, since
 * there are no longer any external relative .ts imports inside the function.
 */
const entries = [
  { in: "index.ts", out: "index.js" },
  { in: "seo.ts", out: "seo.js" },
  { in: "cron/event-reminder.ts", out: "cron/event-reminder.js" },
];

for (const { in: input, out } of entries) {
  const entry = path.join(srcDir, input);
  const outfile = path.join(outDir, out);
  await mkdir(path.dirname(outfile), { recursive: true });
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    packages: "external",
    logLevel: "info",
    sourcemap: false,
  });
  console.log(`bundled ${input} -> ${out}`);
}

// Copy the built client shell so the SEO function can inject per-route metadata
// without depending on dist/ (which is git/vercel-ignored).
await copyFile(
  path.join(root, "dist/public/index.html"),
  path.join(outDir, "shell.html"),
);
console.log("copied dist/public/index.html -> api/shell.html");
console.log("API bundling complete.");
