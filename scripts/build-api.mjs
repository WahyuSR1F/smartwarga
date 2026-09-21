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
  { in: "index.ts", out: "index.cjs" },
  { in: "seo.ts", out: "seo.cjs" },
  { in: "cron/event-reminder.ts", out: "cron/event-reminder.cjs" },
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
    format: "cjs",
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

// Fail early with a clear message if any expected serverless artifact is
// missing. These files must exist (and must NOT be gitignored) because
// vercel.json references them in `functions` and Vercel excludes
// .gitignore-matched files from the deployment.
const required = [
  path.join(outDir, "index.cjs"),
  path.join(outDir, "seo.cjs"),
  path.join(outDir, "cron/event-reminder.cjs"),
  path.join(outDir, "shell.html"),
];
for (const file of required) {
  const { stat } = await import("node:fs/promises");
  try {
    await stat(file);
  } catch {
    console.error(`::error::Required serverless artifact missing: ${file}`);
    console.error("::error::Run `pnpm run build:client` before `build:api`, then retry.");
    process.exit(1);
  }
}

console.log("API bundling complete. All serverless artifacts present.");
