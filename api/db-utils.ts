import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";
import type { AppUser } from "../shared/schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });

export async function getAppUserByUsername(username: string): Promise<AppUser | undefined> {
  const [user] = await db
    .select()
    .from(schema.appUsers)
    .where(eq(schema.appUsers.username, username));
  return user;
}

export async function getAllAppUsers(): Promise<AppUser[]> {
  return await db.select().from(schema.appUsers);
}
