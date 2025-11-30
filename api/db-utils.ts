import { getDb, initializeDb } from "../shared/db-client.js";
import { eq, and } from "drizzle-orm";
import * as schema from "../shared/schema.js";
import type { AppUser, Article, WordPressSite } from "../shared/schema.js";

// Initialize and get the shared database client
let db: any = null;
try {
  initializeDb();
  db = getDb();
} catch (e) {
  console.error("[DB Utils] Failed to initialize:", e);
}

export function getDatabase() {
  if (!db) {
    try {
      db = getDb();
    } catch (e) {
      console.error("[DB Utils] Failed to get database on demand:", e);
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
  return await db.select().from(schema.appUsers);
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

export async function deleteUserSiteCredential(credentialId: string): Promise<void> {
  await db.delete(schema.userSiteCredentials).where(eq(schema.userSiteCredentials.id, credentialId));
}

export async function getArticle(id: string): Promise<any | undefined> {
  const [article] = await db.select().from(schema.articles).where(eq(schema.articles.id, id));
  return article;
}

export async function createArticle(data: any): Promise<any> {
  const [article] = await db.insert(schema.articles).values(data).returning();
  if (!article) throw new Error("Failed to create article");
  return article;
}

export async function updateArticle(id: string, updates: any): Promise<any> {
  await db.update(schema.articles).set({ ...updates, updatedAt: new Date() }).where(eq(schema.articles.id, id));
  return await getArticle(id);
}

export async function createArticlePublishing(data: any): Promise<any> {
  const [pub] = await db.insert(schema.articlePublishing).values(data).returning();
  if (!pub) throw new Error("Failed to create article publishing");
  return pub;
}

export async function getArticlePublishingBySiteAndArticle(siteId: string, articleId: string): Promise<any | undefined> {
  const [pub] = await db
    .select()
    .from(schema.articlePublishing)
    .where(and(eq(schema.articlePublishing.siteId, siteId), eq(schema.articlePublishing.articleId, articleId)));
  return pub;
}

export async function deleteArticle(id: string): Promise<void> {
  await db.delete(schema.articles).where(eq(schema.articles.id, id));
}
