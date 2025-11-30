import { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./db-utils.js";
import { articles, articlePublishing, wordPressSites } from "../shared/schema.js";
import { eq } from "drizzle-orm";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    
    // Get all published articles with their publishing records
    const publishingRecords = await db.select().from(articlePublishing);
    const articlesToCheck = await db.select().from(articles).where(eq(articles.status, 'published'));
    const sitesMap = new Map((await db.select().from(wordPressSites)).map(s => [s.id, s]));
    
    const deletedIds: string[] = [];
    
    console.log(`[Sync] Starting sync check for ${articlesToCheck.length} published articles`);
    
    // Check all articles in PARALLEL for speed
    const checkPromises = articlesToCheck.map(async (article) => {
      const pub = publishingRecords.find(p => p.articleId === article.id);
      if (!pub || !pub.wpPostId) return null;
      
      const site = sitesMap.get(pub.siteId);
      if (!site) return null;
      
      const checkUrl = `${site.apiUrl}/wp/v2/posts/${pub.wpPostId}`;
      
      try {
        const checkRes = await Promise.race([
          fetch(checkUrl),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]) as Response;
        
        if (checkRes.status === 404) {
          console.log(`[Sync] Article ${article.id} deleted from WordPress - removing`);
          return article.id;
        }
      } catch (e) {
        console.error(`[Sync] Check failed for ${article.id}:`, e);
      }
      return null;
    });
    
    const deletedArticleIds = (await Promise.all(checkPromises)).filter(Boolean);
    
    // Delete articles and their publishing records from database
    if (deletedArticleIds.length > 0) {
      console.log(`[Sync] Deleting ${deletedArticleIds.length} articles from database:`, deletedArticleIds);
      for (const id of deletedArticleIds) {
        try {
          const delCount = await db.delete(articles).where(eq(articles.id, id));
          const pubDelCount = await db.delete(articlePublishing).where(eq(articlePublishing.articleId, id));
          console.log(`[Sync] ✓ Deleted article ${id}: articles=${delCount}, publishing=${pubDelCount}`);
          deletedIds.push(id);
        } catch (e) {
          console.error(`[Sync] Error deleting article ${id}:`, e);
        }
      }
    }
    
    const syncedArticles = await db.select().from(articles);
    console.log(`[Sync] Complete: ${deletedIds.length} deleted`);
    res.json({ success: true, deletedCount: deletedIds.length, deletedIds, articles: syncedArticles });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message || "Failed to sync articles" });
  }
};
