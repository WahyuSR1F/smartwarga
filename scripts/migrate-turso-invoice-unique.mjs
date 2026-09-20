import { createClient } from "@libsql/client";
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS invoices_household_period_unique ON invoices (householdId, billingPeriodId)`);
console.log("Applied invoice idempotency index to Turso.");
