import { getDb } from "@shared/db-client";

// Use shared database client to avoid connection pool exhaustion
export const db = getDb();
