import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

let databaseUrl = process.env.DATABASE_URL!; // Assert it exists (checked at build time)
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Auto-fix: If using direct connection (port 5432), switch to Session Pooler (port 6543) for serverless
if (process.env.VERCEL && databaseUrl.includes(":5432")) {
  console.warn("[DB] Detected direct connection on Vercel. Switching to Session Pooler (port 6543)");
  databaseUrl = databaseUrl.replace(":5432", ":6543");
}

// Create a single postgres client with proper pooling for serverless
// This client is reused across all requests (warm invocations)
let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function initializeDb() {
  if (!client) {
    try {
      client = postgres(databaseUrl, {
        max: 1, // Serverless: max 1 connection per function
        idle_timeout: 20, // Close idle connections after 20 seconds
        connect_timeout: 15, // Increased to 15 seconds for Vercel cold starts
        application_name: "wordpress-publisher",
      });
      db = drizzle(client, { schema });
      console.log("[DB] ✓ Connection pool initialized");
    } catch (error: any) {
      console.error("[DB] Failed to initialize connection:", error.message);
      throw error;
    }
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
