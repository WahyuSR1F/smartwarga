import { createClient } from "@libsql/client";
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
await client.execute(`CREATE TABLE IF NOT EXISTS event_reminder_rules (id text PRIMARY KEY NOT NULL, eventId text NOT NULL, organizationId text NOT NULL, templateName text NOT NULL, minutesBefore integer NOT NULL, enabled integer NOT NULL, scheduleCronTaskUid text, createdAt integer NOT NULL, updatedAt integer NOT NULL, FOREIGN KEY (eventId) REFERENCES events(id), FOREIGN KEY (organizationId) REFERENCES organizations(id))`);
await client.execute(`CREATE INDEX IF NOT EXISTS event_reminder_rules_event_idx ON event_reminder_rules (eventId)`);
await client.execute(`CREATE INDEX IF NOT EXISTS event_reminder_rules_task_idx ON event_reminder_rules (scheduleCronTaskUid)`);
console.log("Applied event_reminder_rules migration to Turso.");
