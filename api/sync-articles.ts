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
        // Use admin token for authentication - if adminUsername is available
        let headers: any = {};
        if (site.adminUsername && site.apiToken) {
          const auth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
          headers.Authorization = `Basic ${auth}`;
        }
        
        const checkRes = await Promise.race([
          fetch(checkUrl, { headers }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
        ]) as Response;
        
        if (checkRes.status === 404) {
          console.log(`[Sync] Article ${article.id} deleted from WordPress - removing`);
          return article.id;
        }
        
        if (checkRes.status === 401) {
          console.log(`[Sync] Unauthorized checking post ${pub.wpPostId} - treating as deleted`);
          return article.id;
        }
      } catch (e) {
        console.error(`[Sync] Check failed for ${article.id}:`, e);
      }
      return null;
    });
    
    const deletedArticleIds = (await Promise.all(checkPromises)).filter((id): id is string => id !== null);
    
    // Delete articles and their publishing records from database
    if (deletedArticleIds.length > 0) {
      console.log(`[Sync] Found ${deletedArticleIds.length} deleted articles, removing from DB:`, deletedArticleIds);
      for (const id of deletedArticleIds) {
        try {
          await db.delete(articlePublishing).where(eq(articlePublishing.articleId, id));
          await db.delete(articles).where(eq(articles.id, id));
          deletedIds.push(id);
          console.log(`[Sync] ✓ Deleted article ${id} from database`);
        } catch (e) {
          console.error(`[Sync] Error deleting article ${id}:`, e);
        }
      }
    }
    
    console.log(`[Sync] Complete: ${deletedIds.length} articles removed`);
    
    const syncedArticles = await db.select().from(articles);
    
    // Normalize tags and categories - same logic as content endpoint for consistency
    const normalize = (field: any) => {
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return [];
        }
      }
      if (field === null || field === undefined) return [];
      if (typeof field === 'object') return field;
      return [];
    };
    
    const normalizedArticles = syncedArticles.map((article: any) => ({
      ...article,
      tags: normalize(article.tags),
      categories: normalize(article.categories)
    }));
    
    console.log(`[Sync] Complete: ${deletedIds.length} deleted, returning ${normalizedArticles.length} articles`);
    res.json({ success: true, deletedCount: deletedIds.length, deletedIds, articles: normalizedArticles });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message || "Failed to sync articles" });
  }
};
