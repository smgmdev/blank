import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDatabase } from "./db-utils.js";
import { articles, articlePublishing, wordPressSites } from "../shared/schema.js";
import { eq } from "drizzle-orm";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    console.log("[Vercel Sync] Endpoint called, method:", req.method);
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    
    const db = getDatabase();
    console.log("[Vercel Sync] Database initialized");
    
    // Get all data needed for sync
    const allArticles = await db.select().from(articles);
    const publishingRecords = await db.select().from(articlePublishing);
    const allSites = await db.select().from(wordPressSites);
    console.log("[Vercel Sync] Data loaded:", { articleCount: allArticles.length, pubCount: publishingRecords.length, siteCount: allSites.length });
    
    // Filter to published articles
    const publishedArticles = allArticles.filter((a: any) => a.status === 'published');
    
    let deletedCount = 0;
    const deletedIds: string[] = [];
    
    console.log(`[Sync] Starting sync - found ${allArticles.length} total articles, checking ${publishedArticles.length} published`);
    
    // Group articles by site
    const articlesBySite = new Map<string, any[]>();
    for (const article of publishedArticles) {
      const publishing = publishingRecords.filter((p: any) => p.articleId === article.id);
      if (publishing.length > 0) {
        const siteId = publishing[0].siteId;
        if (!articlesBySite.has(siteId)) {
          articlesBySite.set(siteId, []);
        }
        articlesBySite.get(siteId)!.push({
          article,
          publishing: publishing[0]
        });
      }
    }
    
    // For each site, check articles
    for (const [siteId, siteArticles] of articlesBySite.entries()) {
      const site = allSites.find((s: any) => s.id === siteId) as any;
      if (!site) {
        console.log(`[Sync] Site ${siteId} not found - skipping`);
        continue;
      }
      
      console.log(`[Sync] Site: ${site.name} - checking ${siteArticles.length} articles`);
      
      // Setup auth headers
      const headers: any = {};
      if (site.adminUsername && site.apiToken) {
        const auth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
        headers.Authorization = `Basic ${auth}`;
      } else if (site.adminUsername && site.adminPassword) {
        const auth = Buffer.from(`${site.adminUsername}:${site.adminPassword}`).toString("base64");
        headers.Authorization = `Basic ${auth}`;
      }
      
      console.log(`[Sync] Checking ${siteArticles.length} article post IDs directly...`);
      
      for (const { article, publishing } of siteArticles) {
        const postId = parseInt(publishing.wpPostId, 10);
        
        try {
          // Check if post exists
          const checkUrl = `${site.apiUrl}/wp/v2/posts/${postId}`;
          console.log(`[Sync] Checking article "${article.title}" (wpPostId: ${publishing.wpPostId}) at ${checkUrl}`);
          const checkRes = await fetch(checkUrl, { headers });
          
          console.log(`[Sync] WordPress response: status=${checkRes.status}, ok=${checkRes.ok}`);
          
          if (!checkRes.ok) {
            // Post not found on WordPress - delete it
            const resText = await checkRes.text();
            console.log(`[Sync] Article "${article.title}" (post ${postId}): ✗ NOT found on WordPress (response: ${resText.substring(0, 200)}) - DELETING`);
            try {
              // Delete publishing record first (foreign key constraint)
              await db.delete(articlePublishing).where(eq(articlePublishing.articleId, article.id));
              console.log(`[Sync] ✓ Deleted publishing record for article ${article.id}`);
              
              // Then delete the article
              await db.delete(articles).where(eq(articles.id, article.id));
              console.log(`[Sync] ✓ Successfully deleted article ${article.id}`);
              deletedCount++;
              deletedIds.push(article.id);
            } catch (delError: any) {
              console.error(`[Sync] ERROR deleting article ${article.id}:`, delError.message);
            }
          } else {
            console.log(`[Sync] Article "${article.title}" (post ${postId}): ✓ exists on WordPress`);
          }
        } catch (checkError: any) {
          console.log(`[Sync] Article "${article.title}" (post ${postId}): Error checking - ${checkError.message}`);
        }
      }
    }
    
    const syncedArticles = await db.select().from(articles);
    console.log(`[Sync] Complete: ${deletedCount} deleted, ${deletedIds.length} IDs`);
    res.json({ success: true, deletedCount, deletedIds, articles: syncedArticles });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to sync articles" });
  }
};
