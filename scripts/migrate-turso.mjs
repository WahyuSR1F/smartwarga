import { createClient } from "@libsql/client";
import { readFile } from "node:fs/promises";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) throw new Error("TURSO_DATABASE_URL is required");

const client = createClient({ url, authToken });
const sql = await readFile(new URL("../drizzle/0001_new_blink.sql", import.meta.url), "utf8");
const statements = sql
  .split(/--> statement-breakpoint/g)
  .map(statement => statement.trim())
  .filter(Boolean);

for (const statement of statements) {
  await client.execute(statement);
}

console.log(`Applied ${statements.length} Turso migration statements.`);
