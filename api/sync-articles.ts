import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDatabase } from "./db-utils.js";
import { articles, articlePublishing, wordPressSites, userSiteCredentials } from "../shared/schema.js";
import { eq } from "drizzle-orm";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    
    const db = getDatabase();
    const allArticles = await db.select().from(articles);
    const publishingRecords = await db.select().from(articlePublishing);
    const allSites = await db.select().from(wordPressSites);
    
    const publishedArticles = allArticles.filter((a: any) => a.status === 'published');
    let deletedCount = 0;
    const deletedIds: string[] = [];
    
    console.log(`[Sync] Database articles: ${allArticles.length}, Sites: ${allSites.length}, Publishing records: ${publishingRecords.length}`);
    console.log(`[Sync] Sites in database: ${allSites.map((s: any) => `${s.name}(${s.id})`).join(', ')}`);
    if (allSites.length > 0) {
      const site = allSites[0];
      console.log(`[Sync] First site credentials - username: ${site.adminUsername}, has password: ${!!site.adminPassword}, has apiToken: ${!!site.apiToken}`);
    }
    console.log(`[Sync] Starting - checking ${publishedArticles.length} published articles`);
    
    // Group articles by site
    const articlesBySite = new Map<string, any[]>();
    for (const article of publishedArticles) {
      const publishing = publishingRecords.filter((p: any) => p.articleId === article.id);
      if (publishing.length > 0) {
        const siteId = publishing[0].siteId;
        if (!articlesBySite.has(siteId)) {
          articlesBySite.set(siteId, []);
        }
        articlesBySite.get(siteId)!.push({ article, publishing: publishing[0] });
      }
    }
    
    // Check each article with user API credentials
    for (const [siteId, siteArticles] of articlesBySite.entries()) {
      const site = allSites.find((s: any) => s.id === siteId) as any;
      if (!site) continue;
      
      console.log(`[Sync] Site: ${site.name} - checking ${siteArticles.length} articles`);
      
      // Get user credentials from first article's user
      const firstArticle = siteArticles[0];
      
      // Query for user credentials from same database
      const userCredentials = await db.select()
        .from(userSiteCredentials)
        .where(eq(userSiteCredentials.userId, firstArticle.article.userId))
        .limit(1);
      
      if (!userCredentials || userCredentials.length === 0) {
        console.log(`[Sync] No user credentials found for site ${siteId} - skipping`);
        continue;
      }
      
      const credential = userCredentials[0];
      
      // Setup auth headers using USER credentials (same as publishing)
      const headers: any = {};
      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      headers.Authorization = `Basic ${auth}`;
      console.log(`[Sync] Using user credentials for checking posts: ${credential.wpUsername}`);
      
      // Check each article
      for (const { article, publishing } of siteArticles) {
        const postId = publishing.wpPostId;
        const checkUrl = `${site.apiUrl}/wp/v2/posts/${postId}`;
        
        try {
          const res = await fetch(checkUrl, { headers });
          console.log(`[Sync] Checking ${checkUrl} - Status: ${res.status}`);
          
          const data = await res.json();
          console.log(`[Sync] Response data for post ${postId}:`, JSON.stringify(data).substring(0, 200));
          
          // Check for auth errors
          if (data?.error === "INVALID_PASSWORD" || data?.code === "rest_authentication_failed") {
            console.log(`[Sync] ⚠ Article "${article.title}" (post ${postId}): Auth error - SKIPPING (cannot verify)`);
            continue;
          }
          
          if (data?.id) {
            // Article found on WordPress - keep it
            console.log(`[Sync] ✓ Article "${article.title}" (post ${postId}): Found on WP`);
          } else {
            // Cannot find article on WordPress - delete it
            console.log(`[Sync] ✗ Article "${article.title}" (post ${postId}): Not found on WP - DELETING`);
            await db.delete(articlePublishing).where(eq(articlePublishing.articleId, article.id));
            await db.delete(articles).where(eq(articles.id, article.id));
            deletedCount++;
            deletedIds.push(article.id);
          }
        } catch (e: any) {
          // Network error - cannot verify, skip
          console.log(`[Sync] ⚠ Article "${article.title}" (post ${postId}): Error fetching - ${e.message} - SKIPPING (cannot verify)`);
        }
      }
    }
    
    const syncedArticles = await db.select().from(articles);
    console.log(`[Sync] Complete: ${deletedCount} deleted`);
    res.json({ success: true, deletedCount, deletedIds, articles: syncedArticles });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to sync articles" });
  }
};
