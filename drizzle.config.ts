import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.TURSO_DATABASE_URL;

if (!connectionString) {
  throw new Error("TURSO_DATABASE_URL is required to run Drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: connectionString,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
