import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const databaseUrl = process.env.DATABASE_URL!; // Assert it exists (checked at build time)
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create a single postgres client with proper pooling for serverless
// This client is reused across all requests (warm invocations)
let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function initializeDb() {
  if (!client) {
    client = postgres(databaseUrl, {
      max: 1, // Serverless: max 1 connection per function
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 10, // 10 second connection timeout
    });
    db = drizzle(client, { schema });
  }
  return db!; // Guaranteed to return db after this
}

export function getDb() {
  if (!db) {
    return initializeDb();
  }
  return db;
}

// Graceful shutdown
export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}
