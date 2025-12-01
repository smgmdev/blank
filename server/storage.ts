import { db } from "./db";
import {
  wordPressSites,
  appUsers,
  userSessions,
  approvedWpUsers,
  userSiteCredentials,
  publishingProfiles,
  articles,
  articlePublishing,
  type WordPressSite,
  type InsertWordPressSite,
  type AppUser,
  type InsertAppUser,
  type UserSession,
  type InsertUserSession,
  type ApprovedWpUser,
  type InsertApprovedWpUser,
  type UserSiteCredential,
  type InsertUserSiteCredential,
  type PublishingProfile,
  type InsertPublishingProfile,
  type Article,
  type InsertArticle,
  type ArticlePublishing,
  type InsertArticlePublishing,
} from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

export interface IStorage {
  // WordPress Sites
  createWordPressSite(site: InsertWordPressSite): Promise<WordPressSite>;
  getWordPressSite(id: string): Promise<WordPressSite | undefined>;
  getAllWordPressSites(): Promise<WordPressSite[]>;
  updateWordPressSiteConnection(id: string, isConnected: boolean): Promise<void>;
  updateWordPressSiteAdminCredentials(id: string, adminUsername: string, adminPassword: string, apiToken: string): Promise<void>;
  deleteWordPressSite(id: string): Promise<void>;

  // Users
  createAppUser(user: InsertAppUser): Promise<AppUser>;
  getAppUser(id: string): Promise<AppUser | undefined>;
  getAppUserByUsername(username: string): Promise<AppUser | undefined>;
  getAllAppUsers(): Promise<AppUser[]>;
  updateAppUserProfile(id: string, displayName: string, profilePicture?: string): Promise<void>;
  updateAppUserEmail(id: string, email: string): Promise<void>;
  updateAppUserPassword(id: string, password: string): Promise<void>;
  updateAppUserUsername(id: string, username: string): Promise<void>;
  updateAppUserPin(id: string, pin: string | null): Promise<void>;
  deleteAppUser(id: string): Promise<void>;

  // User Sessions (server-side, for unified login across Replit & Vercel)
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSession(sessionId: string): Promise<UserSession | undefined>;
  getValidUserSession(userId: string): Promise<UserSession | undefined>;
  clearUserSession(sessionId: string): Promise<void>;
  clearUserSessions(userId: string): Promise<void>;

  // Approved WP Users (Admin)
  createApprovedWpUser(user: InsertApprovedWpUser): Promise<ApprovedWpUser>;
  getApprovedWpUser(siteId: string, wpUsername: string): Promise<ApprovedWpUser | undefined>;
  getApprovedWpUsersBySiteId(siteId: string): Promise<ApprovedWpUser[]>;
  deleteApprovedWpUser(id: string): Promise<void>;

  // User Site Credentials
  createUserSiteCredential(
    credential: InsertUserSiteCredential
  ): Promise<UserSiteCredential>;
  getUserSiteCredential(
    userId: string,
    siteId: string
  ): Promise<UserSiteCredential | undefined>;
  getUserSiteCredentialsByUserId(userId: string): Promise<UserSiteCredential[]>;
  updateUserSiteCredentialVerification(
    id: string,
    wpUserId: string
  ): Promise<void>;

  // Publishing Profiles
  createPublishingProfile(
    profile: InsertPublishingProfile
  ): Promise<PublishingProfile>;
  getPublishingProfilesByUserId(userId: string): Promise<PublishingProfile[]>;
  getPublishingProfilesBySiteId(siteId: string): Promise<PublishingProfile[]>;
  deletePublishingProfile(id: string): Promise<void>;

  // Delete credentials
  deleteUserSiteCredential(credentialId: string): Promise<void>;

  // Articles
  createArticle(article: InsertArticle): Promise<Article>;
  getArticle(id: string): Promise<Article | undefined>;
  getArticlesByUserId(userId: string): Promise<Article[]>;
  getAllArticles(): Promise<Article[]>;
  updateArticle(id: string, updates: Partial<InsertArticle>): Promise<void>;
  deleteArticle(id: string): Promise<void>;

  // Article Publishing
  createArticlePublishing(
    publishing: InsertArticlePublishing
  ): Promise<ArticlePublishing>;
  getArticlePublishingByArticleId(
    articleId: string
  ): Promise<ArticlePublishing[]>;
  getArticlePublishingBySiteId(siteId: string): Promise<ArticlePublishing[]>;
}

export class Storage implements IStorage {
  // WordPress Sites
  async createWordPressSite(site: InsertWordPressSite): Promise<WordPressSite> {
    const [result] = await db.insert(wordPressSites).values(site).returning();
    if (!result) throw new Error("Failed to create WordPress site");
    return result;
  }

  async getWordPressSite(id: string): Promise<WordPressSite | undefined> {
    const [site] = await db
      .select()
      .from(wordPressSites)
      .where(eq(wordPressSites.id, id));
    return site;
  }

  async getAllWordPressSites(): Promise<WordPressSite[]> {
    return await db.select().from(wordPressSites);
  }

  async updateWordPressSiteConnection(
    id: string,
    isConnected: boolean
  ): Promise<void> {
    await db
      .update(wordPressSites)
      .set({ isConnected })
      .where(eq(wordPressSites.id, id));
  }

  async updateWordPressSiteAdminCredentials(id: string, adminUsername: string, adminPassword: string, apiToken: string): Promise<void> {
    await db.update(wordPressSites).set({ adminUsername, adminPassword, apiToken }).where(eq(wordPressSites.id, id));
  }

  async deleteWordPressSite(id: string): Promise<void> {
    // Delete cascade: articles and related records first
    const siteArticles = await db
      .select()
      .from(articles)
      .where(eq(articles.siteId, id));
    
    for (const article of siteArticles) {
      await this.deleteArticle(article.id);
    }
    
    // Delete user site credentials
    await db.delete(userSiteCredentials).where(eq(userSiteCredentials.siteId, id));
    
    // Delete approved WP users
    await db.delete(approvedWpUsers).where(eq(approvedWpUsers.siteId, id));
    
    // Delete publishing profiles
    await db.delete(publishingProfiles).where(eq(publishingProfiles.siteId, id));
    
    // Finally delete the site
    await db.delete(wordPressSites).where(eq(wordPressSites.id, id));
  }

  // Approved WP Users
  async createApprovedWpUser(user: InsertApprovedWpUser): Promise<ApprovedWpUser> {
    const [result] = await db.insert(approvedWpUsers).values(user).returning();
    if (!result) throw new Error("Failed to approve WP user");
    return result;
  }

  async getApprovedWpUser(siteId: string, wpUsername: string): Promise<ApprovedWpUser | undefined> {
    const [user] = await db
      .select()
      .from(approvedWpUsers)
      .where(and(
        eq(approvedWpUsers.siteId, siteId),
        eq(approvedWpUsers.wpUsername, wpUsername)
      ));
    return user;
  }

  async getApprovedWpUsersBySiteId(siteId: string): Promise<ApprovedWpUser[]> {
    return await db
      .select()
      .from(approvedWpUsers)
      .where(eq(approvedWpUsers.siteId, siteId));
  }

  async deleteApprovedWpUser(id: string): Promise<void> {
    await db.delete(approvedWpUsers).where(eq(approvedWpUsers.id, id));
  }

  // Users
  async createAppUser(user: InsertAppUser): Promise<AppUser> {
    const [result] = await db.insert(appUsers).values(user).returning();
    if (!result) throw new Error("Failed to create user");
    return result;
  }

  async getAppUser(id: string): Promise<AppUser | undefined> {
    const [user] = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.id, id));
    return user;
  }

  async getAppUserByUsername(username: string): Promise<AppUser | undefined> {
    const [user] = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.username, username));
    return user;
  }

  async getAllAppUsers(): Promise<AppUser[]> {
    return await db.select().from(appUsers);
  }

  async updateAppUserProfile(id: string, displayName: string, profilePicture?: string): Promise<void> {
    await db.update(appUsers).set({ displayName, profilePicture }).where(eq(appUsers.id, id));
  }

  async updateAppUserEmail(id: string, email: string): Promise<void> {
    await db.update(appUsers).set({ email }).where(eq(appUsers.id, id));
  }

  async updateAppUserPassword(id: string, password: string): Promise<void> {
    await db.update(appUsers).set({ password }).where(eq(appUsers.id, id));
  }

  async updateAppUserUsername(id: string, username: string): Promise<void> {
    await db.update(appUsers).set({ username }).where(eq(appUsers.id, id));
  }

  async updateAppUserPin(id: string, pin: string | null): Promise<void> {
    await db.update(appUsers).set({ pin }).where(eq(appUsers.id, id));
  }

  async deleteAppUser(id: string): Promise<void> {
    await db.delete(appUsers).where(eq(appUsers.id, id));
  }

  // User Sessions (server-side)
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [result] = await db.insert(userSessions).values(session).returning();
    if (!result) throw new Error("Failed to create session");
    return result;
  }

  async getUserSession(sessionId: string): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, sessionId));
    return session;
  }

  async getValidUserSession(userId: string): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        gt(userSessions.expiresAt, new Date())
      ));
    return session;
  }

  async clearUserSession(sessionId: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.id, sessionId));
  }

  async clearUserSessions(userId: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
  }

  // User Site Credentials
  async createUserSiteCredential(
    credential: InsertUserSiteCredential
  ): Promise<UserSiteCredential> {
    const [result] = await db
      .insert(userSiteCredentials)
      .values(credential)
      .returning();
    if (!result) throw new Error("Failed to create user site credential");
    return result;
  }

  async upsertUserSiteCredential(
    credential: InsertUserSiteCredential
  ): Promise<UserSiteCredential> {
    // Check if credential already exists
    const existing = await this.getUserSiteCredential(credential.userId, credential.siteId);
    
    if (existing) {
      // Delete the old one and create a new one
      await db.delete(userSiteCredentials).where(eq(userSiteCredentials.id, existing.id));
    }
    
    // Create new credential
    const [result] = await db
      .insert(userSiteCredentials)
      .values(credential)
      .returning();
    if (!result) throw new Error("Failed to upsert user site credential");
    return result;
  }

  async getUserSiteCredential(
    userId: string,
    siteId: string
  ): Promise<UserSiteCredential | undefined> {
    const [credential] = await db
      .select()
      .from(userSiteCredentials)
      .where(and(
        eq(userSiteCredentials.userId, userId),
        eq(userSiteCredentials.siteId, siteId)
      ));
    return credential;
  }

  async getUserSiteCredentialsByUserId(userId: string): Promise<UserSiteCredential[]> {
    return await db
      .select()
      .from(userSiteCredentials)
      .where(eq(userSiteCredentials.userId, userId));
  }

  async updateUserSiteCredentialVerification(
    id: string,
    wpUserId: string
  ): Promise<void> {
    await db
      .update(userSiteCredentials)
      .set({ isVerified: true, wpUserId })
      .where(eq(userSiteCredentials.id, id));
  }

  // Publishing Profiles
  async createPublishingProfile(
    profile: InsertPublishingProfile
  ): Promise<PublishingProfile> {
    const [result] = await db
      .insert(publishingProfiles)
      .values(profile)
      .returning();
    if (!result) throw new Error("Failed to create publishing profile");
    return result;
  }

  async getPublishingProfilesByUserId(
    userId: string
  ): Promise<PublishingProfile[]> {
    return await db
      .select()
      .from(publishingProfiles)
      .where(eq(publishingProfiles.userId, userId));
  }

  async getPublishingProfilesBySiteId(
    siteId: string
  ): Promise<PublishingProfile[]> {
    return await db
      .select()
      .from(publishingProfiles)
      .where(eq(publishingProfiles.siteId, siteId));
  }

  async deletePublishingProfile(id: string): Promise<void> {
    await db
      .delete(publishingProfiles)
      .where(eq(publishingProfiles.id, id));
  }

  async deleteUserSiteCredential(credentialId: string): Promise<void> {
    await db
      .delete(userSiteCredentials)
      .where(eq(userSiteCredentials.id, credentialId));
  }

  // Articles
  async createArticle(article: InsertArticle): Promise<Article> {
    const [result] = await db.insert(articles).values(article).returning();
    if (!result) throw new Error("Failed to create article");
    return result;
  }

  async getArticle(id: string): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    return article;
  }

  async getArticlesByUserId(userId: string): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .where(eq(articles.userId, userId));
  }

  async getAllArticles(): Promise<Article[]> {
    return await db.select().from(articles);
  }

  async updateArticle(
    id: string,
    updates: Partial<InsertArticle> & { featuredImageUrl?: string | null }
  ): Promise<void> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    await db
      .update(articles)
      .set(updateData)
      .where(eq(articles.id, id));
  }

  async deleteArticle(id: string): Promise<void> {
    // Delete publishing records first (cascade delete)
    await db.delete(articlePublishing).where(eq(articlePublishing.articleId, id));
    // Then delete the article
    await db.delete(articles).where(eq(articles.id, id));
  }

  // Article Publishing
  async createArticlePublishing(
    publishing: InsertArticlePublishing
  ): Promise<ArticlePublishing> {
    const [result] = await db
      .insert(articlePublishing)
      .values(publishing)
      .returning();
    if (!result) throw new Error("Failed to create article publishing");
    return result;
  }

  async getArticlePublishingByArticleId(
    articleId: string
  ): Promise<ArticlePublishing[]> {
    return await db
      .select()
      .from(articlePublishing)
      .where(eq(articlePublishing.articleId, articleId));
  }

  async getArticlePublishingBySiteId(
    siteId: string
  ): Promise<ArticlePublishing[]> {
    return await db
      .select()
      .from(articlePublishing)
      .where(eq(articlePublishing.siteId, siteId));
  }
}

export const storage = new Storage();
