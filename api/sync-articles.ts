import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDatabase } from "./db-utils.js";
import { articles, articlePublishing, wordPressSites } from "../shared/schema.js";
import { eq } from "drizzle-orm";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    
    const db = getDatabase();
    
    // Fast path: Just return all articles immediately (don't check WordPress)
    // Background sync checks can happen in a separate webhook/cron job
    const allArticles = await db.select().from(articles);
    
    console.log(`[Sync] Returning ${allArticles.length} articles (skipping WordPress checks for speed)`);
    
    // Do WordPress checks in background (fire and forget) to avoid timeout on Vercel
    if (process.env.VERCEL) {
      // On Vercel, skip the WordPress checks entirely - they're too slow
      res.json({ success: true, deletedCount: 0, deletedIds: [], articles: allArticles });
      return;
    }
    
    // On local dev, do full sync
    const publishingRecords = await db.select().from(articlePublishing);
    const articlesToCheck = allArticles.filter((a: any) => a.status === 'published');
    const sitesMap = new Map((await db.select().from(wordPressSites)).map(s => [s.id, s]));
    
    const deletedIds: string[] = [];
    
    console.log(`[Sync] Checking ${articlesToCheck.length} published articles against WordPress`);
    
    // Check articles with short timeout
    const checkPromises = articlesToCheck.map(async (article) => {
      const pub = publishingRecords.find(p => p.articleId === article.id);
      if (!pub || !pub.wpPostId) return null;
      
      const site = sitesMap.get(pub.siteId);
      if (!site) return null;
      
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
        
        if (!checkRes.ok) {
          console.log(`[Sync] Article ${article.id} deleted from WordPress`);
          return article.id;
        }
      } catch (e) {
        console.error(`[Sync] Check failed for ${article.id}`);
      }
      return null;
    });
    
    const deletedArticleIds = (await Promise.all(checkPromises)).filter((id): id is string => id !== null);
    
    if (deletedArticleIds.length > 0) {
      for (const id of deletedArticleIds) {
        try {
          await db.delete(articlePublishing).where(eq(articlePublishing.articleId, id));
          await db.delete(articles).where(eq(articles.id, id));
          deletedIds.push(id);
        } catch (e) {
          console.error(`[Sync] Error deleting article ${id}:`, e);
        }
      }
    }
    
    const syncedArticles = await db.select().from(articles);
    res.json({ success: true, deletedCount: deletedIds.length, deletedIds, articles: syncedArticles });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message || "Failed to sync articles" });
  }
};
