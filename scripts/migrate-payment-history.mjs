import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await client.batch([
  { sql: "CREATE TABLE IF NOT EXISTS payment_status_history (id TEXT PRIMARY KEY NOT NULL, paymentId TEXT NOT NULL, invoiceId TEXT NOT NULL, status TEXT NOT NULL, actorId INTEGER, note TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, FOREIGN KEY (paymentId) REFERENCES payments(id), FOREIGN KEY (invoiceId) REFERENCES invoices(id), FOREIGN KEY (actorId) REFERENCES users(id))" },
  { sql: "CREATE INDEX IF NOT EXISTS payment_status_history_payment_idx ON payment_status_history (paymentId)" },
  { sql: "CREATE INDEX IF NOT EXISTS payment_status_history_invoice_idx ON payment_status_history (invoiceId)" },
  { sql: "CREATE INDEX IF NOT EXISTS payment_status_history_created_idx ON payment_status_history (createdAt)" },
]);
console.log("payment_status_history migration applied");
