import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) throw new Error("TURSO_DATABASE_URL is required");

const client = createClient({ url, authToken });
await client.execute(`CREATE TABLE IF NOT EXISTS organization_members (organizationId text NOT NULL, userId integer NOT NULL, role text NOT NULL, status text NOT NULL, createdAt integer NOT NULL, updatedAt integer NOT NULL, FOREIGN KEY (organizationId) REFERENCES organizations(id), FOREIGN KEY (userId) REFERENCES users(id))`);
await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS organization_members_pk ON organization_members (organizationId, userId)`);
await client.execute(`CREATE INDEX IF NOT EXISTS organization_members_user_idx ON organization_members (userId)`);
await client.execute(`CREATE INDEX IF NOT EXISTS organization_members_org_idx ON organization_members (organizationId)`);
console.log("Applied organization_members migration to Turso.");
