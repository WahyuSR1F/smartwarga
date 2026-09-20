import { createClient } from "@libsql/client";
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
await client.execute(`CREATE TABLE IF NOT EXISTS forum_reports (id text PRIMARY KEY NOT NULL, postId text NOT NULL, reporterId integer NOT NULL, reason text NOT NULL, status text NOT NULL, createdAt integer NOT NULL, updatedAt integer NOT NULL, FOREIGN KEY (postId) REFERENCES forum_posts(id), FOREIGN KEY (reporterId) REFERENCES users(id))`);
await client.execute(`CREATE INDEX IF NOT EXISTS forum_reports_post_idx ON forum_reports (postId)`);
await client.execute(`CREATE INDEX IF NOT EXISTS forum_reports_status_idx ON forum_reports (status)`);
console.log("Applied forum_reports migration to Turso.");
