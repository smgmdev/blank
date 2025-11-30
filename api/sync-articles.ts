import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDatabase } from "./db-utils.js";
import { articles, articlePublishing, wordPressSites } from "../shared/schema.js";
import { eq } from "drizzle-orm";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    
    const db = getDatabase();
    
    // Get all data needed for sync
    const allArticles = await db.select().from(articles);
    const publishingRecords = await db.select().from(articlePublishing);
    const allSites = await db.select().from(wordPressSites);
    
    // Filter to published articles that have publishing records
    const articlesToCheck = allArticles.filter((a: any) => a.status === 'published');
    const sitesMap = new Map(allSites.map(s => [s.id, s]));
    
    const deletedIds: string[] = [];
    
    console.log(`[Sync] Starting sync - found ${allArticles.length} total articles, ${articlesToCheck.length} published`);
    console.log(`[Sync] Found ${publishingRecords.length} publishing records`);
    
    // Check each published article
    const checkPromises = articlesToCheck.map(async (article) => {
      const pub = publishingRecords.find(p => p.articleId === article.id);
      
      // If no publishing record or wpPostId, skip this article
      if (!pub) {
        console.log(`[Sync] Article ${article.id} has no publishing record, skipping`);
        return null;
      }
      if (!pub.wpPostId) {
        console.log(`[Sync] Article ${article.id} has no wpPostId, skipping`);
        return null;
      }
      
      const site = sitesMap.get(pub.siteId);
      if (!site) {
        console.log(`[Sync] Article ${article.id}: Site ${pub.siteId} not found, skipping`);
        return null;
      }
      
      console.log(`[Sync] Checking article ${article.id} (wpPostId: ${pub.wpPostId}) on site ${site.name}`);
      
      try {
        let headers: any = {};
        if (site.adminUsername && site.apiToken) {
          const auth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
          headers.Authorization = `Basic ${auth}`;
        }
        
        const checkRes = await Promise.race([
          fetch(`${site.apiUrl}/wp/v2/posts/${pub.wpPostId}`, { headers }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]) as Response;
        
        console.log(`[Sync] Article ${article.id}: WordPress returned status ${checkRes.status}`);
        
        // Only delete if we get 404 (post not found). Skip on 401/403 (auth issues)
        if (checkRes.status === 404) {
          console.log(`[Sync] Article ${article.id} marked for deletion - not found in WordPress`);
          return article.id;
        }
        
        // For any other status (401, 403, 500 etc), don't delete
        if (!checkRes.ok) {
          console.log(`[Sync] Article ${article.id}: Got status ${checkRes.status}, keeping article (might be auth issue)`);
        }
      } catch (e: any) {
        console.error(`[Sync] Check failed for article ${article.id}:`, e.message);
      }
      return null;
    });
    
    const deletedArticleIds = (await Promise.all(checkPromises)).filter((id): id is string => id !== null);
    
    console.log(`[Sync] Ready to delete ${deletedArticleIds.length} articles:`, deletedArticleIds);
    
    // Delete articles from system
    if (deletedArticleIds.length > 0) {
      for (const id of deletedArticleIds) {
        try {
          // Delete publishing record first, then article
          await db.delete(articlePublishing).where(eq(articlePublishing.articleId, id));
          await db.delete(articles).where(eq(articles.id, id));
          deletedIds.push(id);
          console.log(`[Sync] ✓ Deleted article ${id}`);
        } catch (e: any) {
          console.error(`[Sync] Error deleting article ${id}:`, e.message);
        }
      }
    }
    
    console.log(`[Sync] Complete: ${deletedIds.length} deleted, IDs:`, deletedIds);
    
    const syncedArticles = await db.select().from(articles);
    res.json({ success: true, deletedCount: deletedIds.length, deletedIds, articles: syncedArticles });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message || "Failed to sync articles" });
  }
};
