import { createClient } from "@libsql/client";
import { describe, expect, it } from "vitest";

describe("Turso integration credentials", () => {
  it.skipIf(!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN)("can execute a read-only health query", async () => {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) return;

    const client = createClient({ url, authToken });
    const result = await client.execute("SELECT 1 AS healthy");

    expect(result.rows[0]?.healthy).toBe(1);
  }, 15_000);
});
