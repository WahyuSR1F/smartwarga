import { describe, expect, it } from "vitest";

describe("integration credentials", () => {
  it.skipIf(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)("can reach the configured Supabase Storage API with server credentials", async () => {
    const baseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!baseUrl || !serviceRoleKey) return;

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/storage/v1/bucket`, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    expect(response.ok).toBe(true);
  }, 15_000);
});
