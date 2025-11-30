import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// WordPress Sites (managed by admins)
export const wordPressSites = pgTable("wordpress_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  apiUrl: text("api_url").notNull(),
  apiToken: text("api_token").notNull(), // Encrypted in production (Application Password)
  adminUsername: text("admin_username"), // Admin username for API access
  adminPassword: text("admin_password"), // Admin password for Basic Auth
  seoPlugin: varchar("seo_plugin", { length: 50 }).notNull(), // "Rank Math" or "AIO SEO PRO"
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  isConnected: boolean("is_connected").default(false),
});

// Users (content creators)
export const appUsers = pgTable("app_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("creator"), // "admin" or "creator"
  email: text("email"),
  companyName: text("company_name"),
  twoFactorSecret: text("two_factor_secret"), // For 2FA
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Approved WordPress Users (admin approves which WP users can publish)
export const approvedWpUsers = pgTable("approved_wp_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull().references(() => wordPressSites.id, { onDelete: "cascade" }),
  wpUsername: text("wp_username").notNull(),
  wpUserId: varchar("wp_user_id"), // WordPress user ID from API
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// User WordPress Credentials (per user per site)
export const userSiteCredentials = pgTable("user_site_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").notNull().references(() => wordPressSites.id, { onDelete: "cascade" }),
  wpUsername: text("wp_username").notNull(),
  wpPassword: text("wp_password").notNull(),
  wpUserId: varchar("wp_user_id"), // WordPress user ID from API
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Publishing Profiles (which sites a user can publish to)
export const publishingProfiles = pgTable("publishing_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").notNull().references(() => wordPressSites.id, { onDelete: "cascade" }),
  credentialId: varchar("credential_id").notNull().references(() => userSiteCredentials.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Articles/Posts
export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").references(() => wordPressSites.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  htmlContent: text("html_content"),
  featuredImageUrl: text("featured_image_url"),
  imageCaption: text("image_caption"),
  categories: jsonb("categories"),
  tags: jsonb("tags"),
  seo: jsonb("seo"),
  status: varchar("status", { length: 20 }).default("draft"), // "draft", "published"
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Article Publishing (tracks which articles are published to which sites)
export const articlePublishing = pgTable("article_publishing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").notNull().references(() => wordPressSites.id, { onDelete: "cascade" }),
  wpPostId: varchar("wp_post_id"), // WordPress post ID after publishing
  publishedAt: timestamp("published_at").default(sql`CURRENT_TIMESTAMP`),
  status: varchar("status", { length: 20 }).default("published"), // "published", "failed"
});

// Schemas for insert operations
export const insertApprovedWpUserSchema = createInsertSchema(approvedWpUsers).omit({
  id: true,
  createdAt: true,
});

export const insertWordPressSiteSchema = createInsertSchema(wordPressSites).omit({
  id: true,
  createdAt: true,
  isConnected: true,
});

export const insertAppUserSchema = createInsertSchema(appUsers).omit({
  id: true,
  createdAt: true,
});

export const insertUserSiteCredentialSchema = createInsertSchema(userSiteCredentials).omit({
  id: true,
  createdAt: true,
  wpUserId: true,
  isVerified: true,
});

export const insertPublishingProfileSchema = createInsertSchema(publishingProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});

export const insertArticlePublishingSchema = createInsertSchema(articlePublishing).omit({
  id: true,
  publishedAt: true,
});

// Types
export type ApprovedWpUser = typeof approvedWpUsers.$inferSelect;
export type InsertApprovedWpUser = z.infer<typeof insertApprovedWpUserSchema>;

export type WordPressSite = typeof wordPressSites.$inferSelect;
export type InsertWordPressSite = z.infer<typeof insertWordPressSiteSchema>;

export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;

export type UserSiteCredential = typeof userSiteCredentials.$inferSelect;
export type InsertUserSiteCredential = z.infer<typeof insertUserSiteCredentialSchema>;

export type PublishingProfile = typeof publishingProfiles.$inferSelect;
export type InsertPublishingProfile = z.infer<typeof insertPublishingProfileSchema>;

export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;

export type ArticlePublishing = typeof articlePublishing.$inferSelect;
export type InsertArticlePublishing = z.infer<typeof insertArticlePublishingSchema>;
