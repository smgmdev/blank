import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import type { AppUser, Article, WordPressSite } from "../shared/schema.js";

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

export async function getArticlesByUserId(userId: string): Promise<Article[]> {
  return await db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.userId, userId));
}

export async function getAllWordPressSites(): Promise<WordPressSite[]> {
  return await db.select().from(schema.wordPressSites);
}

export async function getUserSiteCredentialsByUserId(userId: string): Promise<any[]> {
  return await db
    .select()
    .from(schema.userSiteCredentials)
    .where(eq(schema.userSiteCredentials.userId, userId));
}

export async function getWordPressSiteById(siteId: string): Promise<any | undefined> {
  const [site] = await db
    .select()
    .from(schema.wordPressSites)
    .where(eq(schema.wordPressSites.id, siteId));
  return site;
}

export async function getUserSiteCredential(userId: string, siteId: string): Promise<any | undefined> {
  const [credential] = await db
    .select()
    .from(schema.userSiteCredentials)
    .where(and(eq(schema.userSiteCredentials.userId, userId), eq(schema.userSiteCredentials.siteId, siteId)));
  return credential;
}

export async function createUserSiteCredential(data: any): Promise<any> {
  const [credential] = await db.insert(schema.userSiteCredentials).values(data).returning();
  if (!credential) throw new Error("Failed to create credential");
  return credential;
}

export async function updateUserSiteCredentialVerification(credentialId: string, wpUserId: string): Promise<void> {
  await db
    .update(schema.userSiteCredentials)
    .set({ wpUserId, isVerified: true })
    .where(eq(schema.userSiteCredentials.id, credentialId));
}

export async function createPublishingProfile(data: any): Promise<any> {
  const [profile] = await db.insert(schema.publishingProfiles).values(data).returning();
  if (!profile) throw new Error("Failed to create publishing profile");
  return profile;
}
