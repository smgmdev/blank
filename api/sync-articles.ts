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
    const sitesMap = new Map(allSites.map((s: any) => [s.id, s]));
    
    const deletedIds: string[] = [];
    
    console.log(`[Sync] Starting sync - found ${allArticles.length} total articles, ${articlesToCheck.length} published`);
    console.log(`[Sync] Found ${publishingRecords.length} publishing records`);
    console.log(`[Sync] Article IDs to check: ${articlesToCheck.map((a: any) => a.id).join(', ')}`);
    console.log(`[Sync] Publishing record article IDs: ${publishingRecords.map((p: any) => p.articleId).join(', ')}`);
    
    // Check each published article
    const checkPromises = articlesToCheck.map(async (article: any) => {
      const pub = publishingRecords.find((p: any) => p.articleId === article.id);
      
      // Handle articles WITHOUT publishing records but WITH wpLink
      if (!pub) {
        if (article.wpLink) {
          console.log(`[Sync] Article ${article.id} has no publishing record but has wpLink - attempting to extract postId from wpLink`);
          
          // Try to extract post ID from wpLink
          const postIdMatch = article.wpLink.match(/[?&]p=(\d+)|\/(\d+)(?:\/$|$)/);
          const postId = postIdMatch ? (postIdMatch[1] || postIdMatch[2]) : null;
          
          if (postId && article.siteId) {
            const site = sitesMap.get(article.siteId) as any;
            if (site) {
              console.log(`[Sync] Extracted postId=${postId} from wpLink for article ${article.id}, checking WordPress...`);
              
              try {
                const headers: any = {};
                if ((site as any).adminUsername && (site as any).apiToken) {
                  const auth = Buffer.from(`${(site as any).adminUsername}:${(site as any).apiToken}`).toString("base64");
                  headers.Authorization = `Basic ${auth}`;
                }
                
                const checkRes = await fetch(`${(site as any).apiUrl}/wp/v2/posts/${postId}`, { headers });
                console.log(`[Sync] Article ${article.id}: WordPress returned status ${checkRes.status}`);
                
                try {
                  const responseText = await checkRes.text();
                  try {
                    const data = JSON.parse(responseText) as any;
                    const isNotFound = 
                      data.code === 'rest_post_invalid_id' ||
                      data.code === 'rest_invalid_param' ||
                      data.code === 'not_found' ||
                      data.message?.toLowerCase().includes('not found') ||
                      data.message?.toLowerCase().includes('invalid post') ||
                      (checkRes.ok && !data.id);
                    
                    if (isNotFound) {
                      // Grace period: only delete if published more than 5 minutes ago
                      const publishedTime = article.publishedAt ? new Date(article.publishedAt).getTime() : 0;
                      const now = Date.now();
                      const ageMs = now - publishedTime;
                      const fiveMinutesMs = 5 * 60 * 1000;
                      
                      if (ageMs > fiveMinutesMs) {
                        console.log(`[Sync] Article ${article.id} marked for deletion (post not found on WordPress, age: ${(ageMs/1000).toFixed(0)}s)`);
                        return article.id;
                      } else {
                        console.log(`[Sync] Article ${article.id}: Post not found but too recent (age: ${(ageMs/1000).toFixed(0)}s), skipping delete`);
                      }
                    }
                  } catch {
                    if (!checkRes.ok) {
                      console.log(`[Sync] Article ${article.id} marked for deletion (error response from WordPress)`);
                      return article.id;
                    }
                  }
                } catch (e) {
                  console.log(`[Sync] Article ${article.id}: Error reading response`);
                }
              } catch (e: any) {
                console.error(`[Sync] Error checking wpLink for article ${article.id}:`, e.message);
              }
            }
          }
        } else {
          console.log(`[Sync] Article ${article.id} has no publishing record and no wpLink, skipping`);
        }
        return null;
      }
      
      if (!pub.wpPostId) {
        console.log(`[Sync] Article ${article.id} has no wpPostId, skipping`);
        return null;
      }
      
      const site = sitesMap.get(pub.siteId) as any;
      if (!site) {
        console.log(`[Sync] Article ${article.id}: Site ${pub.siteId} not found, skipping`);
        return null;
      }
      
      console.log(`[Sync] Checking article ${article.id} (wpPostId: ${pub.wpPostId}) on site ${site.name}`);
      console.log(`[Sync] Site has adminUsername: ${!!site.adminUsername}, apiToken: ${!!site.apiToken}`);
      
      try {
        // Use admin credentials if available, otherwise try public access
        const headers: any = {};
        if ((site as any).adminUsername && (site as any).apiToken) {
          const auth = Buffer.from(`${(site as any).adminUsername}:${(site as any).apiToken}`).toString("base64");
          headers.Authorization = `Basic ${auth}`;
          console.log(`[Sync] Using admin auth (${(site as any).adminUsername}) for post ${pub.wpPostId}`);
        } else {
          console.log(`[Sync] No admin credentials (user: ${(site as any).adminUsername}, token: ${!!(site as any).apiToken}), trying public access for post ${pub.wpPostId}`);
        }
        
        const checkRes = await Promise.race([
          fetch(`${(site as any).apiUrl}/wp/v2/posts/${pub.wpPostId}`, { headers }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]) as Response;
        
        console.log(`[Sync] Article ${article.id}: WordPress returned status ${checkRes.status}`);
        
        // ANY non-OK response means post is deleted/not found, BUT only delete if old enough (grace period for recent publishes)
        if (!checkRes.ok) {
          const publishedTime = article.publishedAt ? new Date(article.publishedAt).getTime() : 0;
          const now = Date.now();
          const ageMs = now - publishedTime;
          const fiveMinutesMs = 5 * 60 * 1000;
          
          if (ageMs > fiveMinutesMs) {
            console.log(`[Sync] Article ${article.id} marked for deletion - HTTP ${checkRes.status} (age: ${(ageMs/1000).toFixed(0)}s)`);
            return article.id;
          } else {
            console.log(`[Sync] Article ${article.id}: HTTP ${checkRes.status} but too recent (age: ${(ageMs/1000).toFixed(0)}s), skipping delete`);
          }
        }
        
        // For successful responses, verify we got actual post data
        try {
          const responseText = await checkRes.text();
          const data = JSON.parse(responseText) as any;
          
          // Log response for debugging
          console.log(`[Sync] Article ${article.id}: Response body: ${JSON.stringify(data).substring(0, 200)}`);
          
          // Check if post is missing/empty - WordPress returns 200 for deleted posts
          const isMissing = !data.id || !data.title || data.title.raw === '';
          
          // Check for various error patterns in successful response
          const isNotFound = 
            isMissing ||
            data.code === 'rest_post_invalid_id' ||
            data.code === 'rest_invalid_param' ||
            data.code === 'not_found' ||
            data.message?.toLowerCase().includes('not found') ||
            data.message?.toLowerCase().includes('invalid post') ||
            data.message?.toLowerCase().includes('no post');
          
          if (isNotFound) {
            // Grace period: only delete if published more than 5 minutes ago
            const publishedTime = article.publishedAt ? new Date(article.publishedAt).getTime() : 0;
            const now = Date.now();
            const ageMs = now - publishedTime;
            const fiveMinutesMs = 5 * 60 * 1000;
            
            if (ageMs > fiveMinutesMs) {
              const reason = isMissing ? `post empty/missing (id: ${data.id}, title: ${data.title?.raw || 'missing'})` : (data.code || data.message || 'no post data');
              console.log(`[Sync] Article ${article.id} marked for deletion - ${reason} (age: ${(ageMs/1000).toFixed(0)}s)`);
              return article.id;
            } else {
              const reason = isMissing ? `post empty/missing (id: ${data.id}, title: ${data.title?.raw || 'missing'})` : (data.code || data.message || 'no post data');
              console.log(`[Sync] Article ${article.id}: ${reason} but too recent (age: ${(ageMs/1000).toFixed(0)}s), skipping delete`);
            }
          }
          
          console.log(`[Sync] Article ${article.id}: Post exists (status ${checkRes.status})`);
        } catch (e) {
          // Error reading/parsing response - treat as deleted
          console.log(`[Sync] Article ${article.id}: Error reading response (${(e as any).message}) - treating as deleted`);
          return article.id;
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
