import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDatabase } from "./db-utils.js";
import { articles, articlePublishing, wordPressSites } from "../shared/schema.js";
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
    
    // Check each article with admin API
    for (const [siteId, siteArticles] of articlesBySite.entries()) {
      const site = allSites.find((s: any) => s.id === siteId) as any;
      if (!site) continue;
      
      console.log(`[Sync] Site: ${site.name} - checking ${siteArticles.length} articles with admin API`);
      
      // Build admin auth header
      const headers: any = {};
      if (site.adminUsername && site.apiToken) {
        const auth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
        headers.Authorization = `Basic ${auth}`;
      } else if (site.adminUsername && site.adminPassword) {
        const auth = Buffer.from(`${site.adminUsername}:${site.adminPassword}`).toString("base64");
        headers.Authorization = `Basic ${auth}`;
      }
      
      // Check each article
      for (const { article, publishing } of siteArticles) {
        const postId = publishing.wpPostId;
        const checkUrl = `${site.apiUrl}/wp/v2/posts/${postId}`;
        
        try {
          const res = await fetch(checkUrl, { headers });
          
          if (res.ok) {
            // Article exists on WordPress
            const data = await res.json();
            if (data?.id) {
              console.log(`[Sync] ✓ Article "${article.title}" (post ${postId}): EXISTS`);
            } else {
              // No ID in response - delete it
              console.log(`[Sync] ✗ Article "${article.title}" (post ${postId}): DELETING`);
              await db.delete(articlePublishing).where(eq(articlePublishing.articleId, article.id));
              await db.delete(articles).where(eq(articles.id, article.id));
              deletedCount++;
              deletedIds.push(article.id);
            }
          } else {
            // Article not found on WordPress - delete it
            console.log(`[Sync] ✗ Article "${article.title}" (post ${postId}): NOT FOUND on WordPress - DELETING`);
            await db.delete(articlePublishing).where(eq(articlePublishing.articleId, article.id));
            await db.delete(articles).where(eq(articles.id, article.id));
            deletedCount++;
            deletedIds.push(article.id);
          }
        } catch (e: any) {
          console.error(`[Sync] Error checking article ${article.id}:`, e.message);
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
