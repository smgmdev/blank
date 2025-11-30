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
      console.log(`[Sync] Site has adminUsername: ${!!site.adminUsername}, apiToken: ${!!site.apiToken}`);
      
      try {
        // Use admin credentials if available, otherwise try public access
        const headers: any = {};
        if (site.adminUsername && site.apiToken) {
          const auth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
          headers.Authorization = `Basic ${auth}`;
          console.log(`[Sync] Using admin auth (${site.adminUsername}) for post ${pub.wpPostId}`);
        } else {
          console.log(`[Sync] No admin credentials (user: ${site.adminUsername}, token: ${!!site.apiToken}), trying public access for post ${pub.wpPostId}`);
        }
        
        const checkRes = await Promise.race([
          fetch(`${site.apiUrl}/wp/v2/posts/${pub.wpPostId}`, { headers }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]) as Response;
        
        console.log(`[Sync] Article ${article.id}: WordPress returned status ${checkRes.status}`);
        
        // Delete if: 404 (Not Found), 410 (Gone), or 401 (Unauthorized - likely deleted post we can't access)
        if (checkRes.status === 404 || checkRes.status === 410 || checkRes.status === 401) {
          console.log(`[Sync] Article ${article.id} marked for deletion - not found in WordPress (status ${checkRes.status})`);
          return article.id;
        }
        
        // Also check response body for error indicators
        try {
          const responseText = await checkRes.text();
          
          try {
            const data = JSON.parse(responseText) as any;
            
            // Check for error codes indicating post doesn't exist
            if (data.code === 'rest_post_invalid_id' || 
                data.code === 'rest_invalid_param' || 
                data.message?.includes('not found') ||
                data.message?.includes('No post found')) {
              console.log(`[Sync] Article ${article.id} marked for deletion - error: ${data.code || data.message}`);
              return article.id;
            }
          } catch {
            // Not JSON, skip body check
          }
        } catch (e) {
          // Couldn't read response
        }
      } catch (e: any) {
        console.error(`[Sync] Check failed for article ${article.id}:`, e.message);
      }
      return null;
    });
    
    const deletedArticleIds = (await Promise.all(checkPromises)).filter((id): id is string => id !== null);
    
    console.log(`[Sync] Checking deleted articles: count=${deletedArticleIds.length}, IDs:`, deletedArticleIds);
    
    // Delete articles from system only if we found them with 404
    if (deletedArticleIds.length > 0) {
      for (const id of deletedArticleIds) {
        try {
          console.log(`[Sync] Deleting article ${id} from database`);
          // Delete publishing record first, then article
          await db.delete(articlePublishing).where(eq(articlePublishing.articleId, id));
          await db.delete(articles).where(eq(articles.id, id));
          deletedIds.push(id);
          console.log(`[Sync] ✓ Successfully deleted article ${id}`);
        } catch (e: any) {
          console.error(`[Sync] Error deleting article ${id}:`, e.message);
        }
      }
    }
    
    console.log(`[Sync] ========== SYNC COMPLETE ==========`);
    console.log(`[Sync] Articles checked: ${articlesToCheck.length}`);
    console.log(`[Sync] Articles deleted: ${deletedIds.length}`);
    console.log(`[Sync] Deleted IDs: ${deletedIds.join(', ') || 'none'}`);
    console.log(`[Sync] ====================================`);
    
    const syncedArticles = await db.select().from(articles);
    res.json({ success: true, deletedCount: deletedIds.length, deletedIds, articles: syncedArticles });
  } catch (error: any) {
    console.error("[Sync] Fatal error:", error);
    res.status(500).json({ error: error.message || "Failed to sync articles" });
  }
};
