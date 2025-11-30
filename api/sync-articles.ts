import { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./db-utils.js";
import { articles, articlePublishing, wordPressSites } from "../shared/schema.js";
import { eq } from "drizzle-orm";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    
    const allArticles = await db.select().from(articles);
    let deletedCount = 0;
    const deletedIds: string[] = [];
    
    console.log(`[Sync] Starting sync check for ${allArticles.length} articles`);
    console.log(`[Sync] Article IDs to check:`, allArticles.map(a => ({ id: a.id, status: a.status, siteId: a.siteId })));
    
    for (const article of allArticles) {
      if (article.status === 'published' && article.siteId) {
        try {
          const publishing = await db.select().from(articlePublishing).where(eq(articlePublishing.articleId, article.id));
          console.log(`[Sync] Article ${article.id}: found ${publishing.length} publishing records`);
          
          if (publishing.length > 0) {
            const pub = publishing[0];
            const [site] = await db.select().from(wordPressSites).where(eq(wordPressSites.id, pub.siteId));
            console.log(`[Sync] Article ${article.id}: wpPostId=${pub.wpPostId}, site=${site?.name}`);
            
            if (site && pub.wpPostId) {
              const postId = parseInt(pub.wpPostId, 10);
              const checkUrl = `${site.apiUrl}/wp/v2/posts/${postId}`;
              console.log(`[Sync] Checking URL: ${checkUrl}`);
              
              try {
                const checkRes = await fetch(checkUrl);
                console.log(`[Sync] Response status: ${checkRes.status}`);
                
                if (checkRes.status === 404) {
                  console.log(`[Sync] Article ${article.id} deleted from WordPress - removing from app`);
                  await db.delete(articles).where(eq(articles.id, article.id));
                  deletedCount++;
                  deletedIds.push(article.id);
                } else if (!checkRes.ok) {
                  console.log(`[Sync] Article ${article.id}: Got status ${checkRes.status}, not deleting`);
                }
              } catch (fetchError) {
                console.error(`[Sync] Fetch error for post ${postId}:`, fetchError);
              }
            } else {
              console.log(`[Sync] Article ${article.id}: Missing wpPostId - skipping check`);
            }
          }
        } catch (error) {
          console.error(`[Sync] Sync check error for article ${article.id}:`, error);
        }
      }
    }
    
    const syncedArticles = await db.select().from(articles);
    console.log(`[Sync] Complete: ${deletedCount} deleted, ${deletedIds.length} IDs`);
    res.json({ success: true, deletedCount, deletedIds, articles: syncedArticles });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message || "Failed to sync articles" });
  }
};
