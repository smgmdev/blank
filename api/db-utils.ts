import { getDb, initializeDb } from "../shared/db-client.js";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "../shared/schema.js";
import type { AppUser, Article, WordPressSite } from "../shared/schema.js";

// Initialize and get the shared database client
let db: any = null;
let schemaInitialized = false;

async function initializeSchema() {
  if (schemaInitialized || !db) return;
  try {
    // Create user_sessions table if missing (for Vercel)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);
    schemaInitialized = true;
    console.log("[DB Utils] Schema initialized with user_sessions table");
  } catch (e: any) {
    console.error("[DB Utils] Failed to initialize schema:", e.message || e);
  }
}

try {
  initializeDb();
  db = getDb();
  initializeSchema().catch(e => console.error("[DB Utils] Schema init error:", e));
} catch (e) {
  console.error("[DB Utils] Failed to initialize:", e);
}

export function getDatabase() {
  if (!db) {
    try {
      console.log("[DB Utils] Initializing database connection");
      db = getDb();
      console.log("[DB Utils] Database connection initialized");
    } catch (e: any) {
      console.error("[DB Utils] Failed to get database on demand:", e.message || e);
      throw e;
    }
  }
  return db;
}

export async function getAppUserByUsername(username: string): Promise<AppUser | undefined> {
  const database = getDatabase();
  try {
    const [user] = await database
      .select()
      .from(schema.appUsers)
      .where(eq(schema.appUsers.username, username));
    return user;
  } catch (e: any) {
    console.error("[DB] getAppUserByUsername failed:", e.message || e);
    throw e;
  }
}

export async function getAllAppUsers(): Promise<AppUser[]> {
  const database = getDatabase();
  return await database.select().from(schema.appUsers);
}

export async function getArticlesByUserId(userId: string): Promise<Article[]> {
  const database = getDatabase();
  try {
    const result = await database
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.userId, userId));
    console.log(`[DB] getArticlesByUserId(${userId}): returned ${result?.length || 0} articles`);
    return result || [];
  } catch (e: any) {
    console.error("[DB] getArticlesByUserId failed:", { userId, error: e.message || e, stack: e.stack });
    throw e;
  }
}

export async function getAllWordPressSites(): Promise<WordPressSite[]> {
  const database = getDatabase();
  return await database.select().from(schema.wordPressSites);
}

export async function getUserSiteCredentialsByUserId(userId: string): Promise<any[]> {
  const database = getDatabase();
  return await database
    .select()
    .from(schema.userSiteCredentials)
    .where(eq(schema.userSiteCredentials.userId, userId));
}

export async function getWordPressSiteById(siteId: string): Promise<any | undefined> {
  const database = getDatabase();
  const [site] = await database
    .select()
    .from(schema.wordPressSites)
    .where(eq(schema.wordPressSites.id, siteId));
  return site;
}

export async function getUserSiteCredential(userId: string, siteId: string): Promise<any | undefined> {
  const database = getDatabase();
  const [credential] = await database
    .select()
    .from(schema.userSiteCredentials)
    .where(and(eq(schema.userSiteCredentials.userId, userId), eq(schema.userSiteCredentials.siteId, siteId)));
  return credential;
}

export async function createUserSiteCredential(data: any): Promise<any> {
  const database = getDatabase();
  const [credential] = await database.insert(schema.userSiteCredentials).values(data).returning();
  if (!credential) throw new Error("Failed to create credential");
  return credential;
}

export async function upsertUserSiteCredential(data: any): Promise<any> {
  const database = getDatabase();
  // Check if credential already exists
  const existing = await getUserSiteCredential(data.userId, data.siteId);
  
  if (existing) {
    // Delete the old one and create a new one
    await database.delete(schema.userSiteCredentials).where(eq(schema.userSiteCredentials.id, existing.id));
  }
  
  // Create new credential
  const [credential] = await database.insert(schema.userSiteCredentials).values(data).returning();
  if (!credential) throw new Error("Failed to upsert credential");
  return credential;
}

export async function updateUserSiteCredentialVerification(credentialId: string, wpUserId: string): Promise<void> {
  const database = getDatabase();
  await database
    .update(schema.userSiteCredentials)
    .set({ wpUserId, isVerified: true })
    .where(eq(schema.userSiteCredentials.id, credentialId));
}

export async function createPublishingProfile(data: any): Promise<any> {
  const database = getDatabase();
  const [profile] = await database.insert(schema.publishingProfiles).values(data).returning();
  if (!profile) throw new Error("Failed to create publishing profile");
  return profile;
}

export async function getPublishingProfilesByUserId(userId: string): Promise<any[]> {
  const database = getDatabase();
  return await database
    .select()
    .from(schema.publishingProfiles)
    .where(eq(schema.publishingProfiles.userId, userId));
}

export async function deleteUserSiteCredential(credentialId: string): Promise<void> {
  const database = getDatabase();
  await database.delete(schema.userSiteCredentials).where(eq(schema.userSiteCredentials.id, credentialId));
}

export async function getArticle(id: string): Promise<any | undefined> {
  const database = getDatabase();
  const [article] = await database.select().from(schema.articles).where(eq(schema.articles.id, id));
  return article;
}

export async function createArticle(data: any): Promise<any> {
  const database = getDatabase();
  const [article] = await database.insert(schema.articles).values(data).returning();
  if (!article) throw new Error("Failed to create article");
  return article;
}

export async function updateArticle(id: string, updates: any): Promise<any> {
  const database = getDatabase();
  await database.update(schema.articles).set({ ...updates, updatedAt: new Date() }).where(eq(schema.articles.id, id));
  return await getArticle(id);
}

export async function createArticlePublishing(data: any): Promise<any> {
  const database = getDatabase();
  const [pub] = await database.insert(schema.articlePublishing).values(data).returning();
  if (!pub) throw new Error("Failed to create article publishing");
  return pub;
}

export async function getArticlePublishingBySiteAndArticle(siteId: string, articleId: string): Promise<any | undefined> {
  const database = getDatabase();
  const [pub] = await database
    .select()
    .from(schema.articlePublishing)
    .where(and(eq(schema.articlePublishing.siteId, siteId), eq(schema.articlePublishing.articleId, articleId)));
  return pub;
}

export async function deleteArticle(id: string): Promise<void> {
  const database = getDatabase();
  await database.delete(schema.articles).where(eq(schema.articles.id, id));
}

export async function getAppUserById(userId: string): Promise<any | undefined> {
  const database = getDatabase();
  try {
    const [user] = await database.select().from(schema.appUsers).where(eq(schema.appUsers.id, userId));
    return user;
  } catch (e: any) {
    console.error("[DB] getAppUserById failed:", e.message || e);
    throw e;
  }
}

export async function updateAppUser(userId: string, updates: any): Promise<any> {
  const database = getDatabase();
  const setData: any = {};
  
  // Map update fields to schema fields
  if (updates.username !== undefined) setData.username = updates.username;
  if (updates.email !== undefined) setData.email = updates.email;
  if (updates.password !== undefined) setData.password = updates.password;
  if (updates.displayName !== undefined) setData.displayName = updates.displayName;
  if (updates.pin !== undefined) setData.pin = updates.pin;
  if (updates.companyName !== undefined) setData.companyName = updates.companyName;
  if (updates.role !== undefined) setData.role = updates.role;
  
  if (Object.keys(setData).length > 0) {
    await database.update(schema.appUsers).set(setData).where(eq(schema.appUsers.id, userId));
  }
  return await getAppUserById(userId);
}

export async function createUserSession(userId: string, expiresAt: Date): Promise<any> {
  const database = getDatabase();
  const { userSessions } = await import("../shared/schema.js");
  const [session] = await database.insert(userSessions).values({ userId, expiresAt }).returning();
  if (!session) throw new Error("Failed to create session");
  return session;
}

export async function getUserSession(sessionId: string): Promise<any | undefined> {
  const database = getDatabase();
  const { userSessions } = await import("../shared/schema.js");
  const [session] = await database.select().from(userSessions).where(eq(userSessions.id, sessionId));
  return session;
}

export async function clearUserSession(sessionId: string): Promise<void> {
  const database = getDatabase();
  const { userSessions } = await import("../shared/schema.js");
  await database.delete(userSessions).where(eq(userSessions.id, sessionId));
}
