import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await client.execute(`CREATE TABLE IF NOT EXISTS announcements (
  id text PRIMARY KEY NOT NULL,
  organizationId text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  body text NOT NULL,
  status text NOT NULL,
  publishedAt integer,
  createdBy integer NOT NULL,
  createdAt integer NOT NULL,
  updatedAt integer NOT NULL,
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
)`);
await client.execute("CREATE INDEX IF NOT EXISTS announcements_org_idx ON announcements (organizationId)");
await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS announcements_slug_idx ON announcements (organizationId, slug)");
await client.execute("CREATE INDEX IF NOT EXISTS announcements_status_idx ON announcements (status)");
console.log("Applied announcements migration to Turso.");
