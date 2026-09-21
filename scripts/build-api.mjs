import { build } from "esbuild";
import { copyFile, mkdir, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const srcDir = path.join(root, "api-src");
const outDir = path.join(root, "api");

// ---------------------------------------------------------------------------
// 1. Clean up stale .cjs artifacts from the previous (broken) format.
//    Vercel does NOT recognise `.cjs` files as Serverless Functions, so they
//    must be removed to avoid confusion.
// ---------------------------------------------------------------------------
const stale = ["api/index.cjs", "api/seo.cjs", "api/cron/event-reminder.cjs"];
for (const rel of stale) {
  try { await unlink(path.join(root, rel)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// 2. Bundle each serverless entry into a self-contained .js (ESM) file.
//
//    Because package.json has  "type": "module"  the .js extension is treated
//    as ESM by Node.  esbuild's `format: "esm"` + a tiny banner that polyfills
//    `__dirname` (which doesn't exist in native ESM) keeps the bundled code
//    working exactly as before — no source-level changes needed.
// ---------------------------------------------------------------------------
const entries = [
  { in: "index.ts",  out: "index.js" },
  { in: "seo.ts",    out: "seo.js" },
  { in: "cron/event-reminder.ts", out: "cron/event-reminder.js" },
];

for (const { in: input, out } of entries) {
  const entry   = path.join(srcDir, input);
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
    // Inject __dirname for ESM so seo.cjs→seo.js can still resolve
    // path.join(__dirname, "shell.html") at runtime.
    banner: {
      js: 'const __dirname = new URL(".", import.meta.url).pathname;',
    },
  });
  console.log(`bundled ${input} -> ${out}`);
}

// ---------------------------------------------------------------------------
// 3. Copy the built client shell into api/ so the SEO function can read it at
//    runtime (via `includeFiles` in vercel.json).
// ---------------------------------------------------------------------------
await copyFile(
  path.join(root, "dist/public/index.html"),
  path.join(outDir, "shell.html"),
);
console.log("copied dist/public/index.html -> api/shell.html");

// ---------------------------------------------------------------------------
// 4. Validate that every required artifact actually exists on disk.
// ---------------------------------------------------------------------------
const required = [
  path.join(outDir, "index.js"),
  path.join(outDir, "seo.js"),
  path.join(outDir, "cron/event-reminder.js"),
  path.join(outDir, "shell.html"),
];
for (const file of required) {
  try {
    await stat(file);
  } catch {
    console.error(`::error::Required serverless artifact missing: ${file}`);
    console.error("::error::Run `pnpm run build:client` before `build:api`, then retry.");
    process.exit(1);
  }
}

console.log("API bundling complete. All serverless artifacts present.");
