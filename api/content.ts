import { VercelRequest, VercelResponse } from "@vercel/node";
import { getWordPressSiteById, getUserSiteCredential, getArticle, createArticle, updateArticle, createArticlePublishing, getArticlePublishingBySiteAndArticle, getArticlesByUserId, deleteArticle, getDatabase } from "./db-utils.js";
import { insertArticleSchema, articles, articlePublishing, wordPressSites } from "../shared/schema.js";
import { eq } from "drizzle-orm";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Handle Vercel's query params which might be arrays or strings
    const getQueryParam = (param: any): string | undefined => {
      if (Array.isArray(param)) return param[0];
      return param as string | undefined;
    };
    
    const type = getQueryParam(req.query.type);
    const userId = getQueryParam(req.query.userId);
    const siteId = getQueryParam(req.query.siteId);
    const articleId = getQueryParam(req.query.articleId);

    // /api/content?type=articles - GET all articles or POST new article
    if (!type || type === "articles") {
      if (req.method === "GET") {
        // GET single article by ID if articleId provided
        if (articleId) {
          try {
            const article = await getArticle(articleId);
            if (!article) return res.status(404).json({ error: "Article not found" });
            
            // Return article as-is from database
            return res.json(article);
          } catch (e: any) {
            console.error('Error fetching article:', articleId, e);
            return res.status(500).json({ error: e.message || "Failed to fetch article" });
          }
        }
        
        // GET all articles for user
        const userIdHeader = req.headers["x-user-id"] as string;
        if (!userIdHeader) return res.status(401).json({ error: "User ID required" });
        
        const articles = await getArticlesByUserId(userIdHeader);
        
        // Return articles as-is from database
        res.json(articles);
      } else if (req.method === "POST") {
        const parsed = insertArticleSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
        
        const article = await createArticle(parsed.data);
        res.json(article);
      } else if (req.method === "PATCH") {
        // UPDATE article
        if (!articleId) return res.status(400).json({ error: "articleId required" });
        try {
          console.log('Updating article:', { articleId, body: req.body });
          const article = await updateArticle(articleId, req.body);
          if (!article) return res.status(404).json({ error: "Article not found or update failed" });
          res.json(article);
        } catch (e: any) {
          console.error('Update article error:', { articleId, error: e.message });
          return res.status(500).json({ error: e.message || "Failed to update article" });
        }
      } else if (req.method === "DELETE") {
        // DELETE article (with WordPress sync)
        if (!articleId) return res.status(400).json({ error: "articleId required" });
        try {
          console.log('[Delete] Starting article deletion:', articleId);
          
          // Get article and check if published
          const database = getDatabase();
          const article = await database.select().from(articles).where(eq(articles.id, articleId));
          if (!article.length) return res.status(404).json({ error: "Article not found" });
          
          const pub = await database.select().from(articlePublishing).where(eq(articlePublishing.articleId, articleId));
          
          // If published to WordPress, delete from WP first
          if (pub.length > 0 && pub[0].wpPostId) {
            try {
              const publishRec = pub[0];
              const database = getDatabase();
              const [site] = await database.select().from(wordPressSites).where(eq(wordPressSites.id, publishRec.siteId));
              
              if (site && publishRec.wpPostId) {
                const credential = await getUserSiteCredential(userId as string, publishRec.siteId);
                if (credential?.isVerified) {
                  const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
                  const deleteUrl = `${site.apiUrl}/wp/v2/posts/${publishRec.wpPostId}?force=true`;
                  console.log('[Delete] Deleting from WordPress:', deleteUrl);
                  
                  const wpDeleteRes = await fetch(deleteUrl, {
                    method: 'DELETE',
                    headers: { Authorization: `Basic ${auth}` }
                  });
                  
                  if (wpDeleteRes.ok) {
                    console.log('[Delete] Successfully deleted from WordPress:', publishRec.wpPostId);
                  } else {
                    console.warn('[Delete] WordPress deletion returned status', wpDeleteRes.status);
                    // Continue with local deletion anyway
                  }
                }
              }
            } catch (wpError) {
              console.error('[Delete] WordPress deletion failed:', wpError);
              // Continue with local deletion
            }
          }
          
          // Delete from local database
          console.log('[Delete] Deleting from local database:', articleId);
          await deleteArticle(articleId);
          res.json({ success: true });
        } catch (e: any) {
          console.error('Delete article error:', { articleId, error: e.message });
          return res.status(500).json({ error: e.message || "Failed to delete article" });
        }
      } else {
        res.status(405).json({ error: "Method not allowed" });
      }
    }
    // /api/content?type=categories
    else if (type === "categories") {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      if (!userId || !siteId) return res.status(400).json({ error: "userId and siteId required" });
      
      const site = await getWordPressSiteById(siteId as string);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await getUserSiteCredential(userId as string, siteId as string);
      if (!credential || !credential.isVerified) return res.status(403).json({ error: "Not authenticated" });

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      console.log("[Categories] Fetching from:", site.apiUrl, "with user:", credential.wpUsername);
      const response = await fetch(`${site.apiUrl}/wp/v2/categories?per_page=100`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      if (!response.ok) {
        console.error("[Categories] Failed:", response.status, await response.text());
        return res.status(response.status).json({ error: "Failed to fetch categories" });
      }

      const categories = await response.json();
      console.log("[Categories] ✓ Fetched:", categories.length, "categories");
      res.json(categories.map((cat: any) => ({ id: cat.id, name: cat.name })));
    }
    // /api/content?type=tags
    else if (type === "tags") {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      if (!userId || !siteId) return res.status(400).json({ error: "userId and siteId required" });
      
      const site = await getWordPressSiteById(siteId as string);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await getUserSiteCredential(userId as string, siteId as string);
      if (!credential || !credential.isVerified) return res.status(403).json({ error: "Not authenticated" });

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      
      // Fetch with higher per_page to get all tags and disable caching
      const response = await fetch(`${site.apiUrl}/wp/v2/tags?per_page=100&_cache_control=no-cache`, {
        headers: { Authorization: `Basic ${auth}`, "Cache-Control": "no-cache" }
      });
      
      if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch tags" });

      const tags = await response.json();
      console.log("[Tags] ✓ Fetched:", tags.length, "tags");
      res.json(tags.map((tag: any) => ({ id: tag.id, name: tag.name })));
    }
    // /api/content?type=publishing - GET publishing info
    else if (type === "publishing") {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      if (!articleId || !siteId) return res.status(400).json({ error: "articleId and siteId required" });
      
      const pub = await getArticlePublishingBySiteAndArticle(siteId as string, articleId as string);
      if (!pub) return res.status(404).json({ error: "Publishing info not found" });
      
      // Get site info to construct wpLink if not saved
      const site = await getWordPressSiteById(siteId as string);
      const wpLink = pub.wpLink || (site && pub.wpPostId ? `${site.url}?p=${pub.wpPostId}` : null);
      
      // Get article to fetch featured image URL
      const article = await getArticle(articleId as string);
      
      res.json({ ...pub, wpLink, featuredImageUrl: article?.featuredImageUrl });
    }
    // /api/content?type=publish - POST publish article
    else if (type === "publish") {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      if (!articleId) return res.status(400).json({ error: "articleId required" });

      const { siteId: sid, userId: uid, title, content, categories, tags, featuredImageBase64, imageCaption } = req.body;
      if (!sid || !uid) return res.status(400).json({ error: "siteId and userId required" });

      const site = await getWordPressSiteById(sid);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await getUserSiteCredential(uid, sid);
      if (!credential || !credential.isVerified) return res.status(403).json({ error: "Not authenticated" });

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      
      let featuredMediaId = null;
      let featuredImageUrl = null;
      if (featuredImageBase64) {
        try {
          console.log("[Publish] Image upload started, base64 length:", featuredImageBase64?.length || 0);
          const base64Data = featuredImageBase64.split(',')[1] || featuredImageBase64;
          const imageBuffer = Buffer.from(base64Data, 'base64');
          console.log("[Publish] Image buffer size:", imageBuffer.length);
          
          let ext = "jpg", ct = "image/jpeg";
          if (featuredImageBase64.includes("png")) { ext = "png"; ct = "image/png"; }
          else if (featuredImageBase64.includes("webp")) { ext = "webp"; ct = "image/webp"; }
          else if (featuredImageBase64.includes("gif")) { ext = "gif"; ct = "image/gif"; }
          
          console.log("[Publish] Uploading image with user auth:", { username: credential.wpUsername, ext, ct, site: site.url });
          
          const mediaResponse = await fetch(`${site.apiUrl}/wp/v2/media`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": ct,
              "Content-Disposition": `attachment; filename="featured-image.${ext}"`
            },
            body: imageBuffer
          });
          
          console.log("[Publish] Media response status:", mediaResponse.status);
          
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            featuredMediaId = mediaData.id;
            featuredImageUrl = mediaData.source_url;
            
            // Update media caption if provided
            if (imageCaption) {
              await fetch(`${site.apiUrl}/wp/v2/media/${featuredMediaId}`, {
                method: "POST",
                headers: {
                  Authorization: `Basic ${auth}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ caption: { raw: imageCaption } })
              });
              console.log("[Publish] ✓ Image uploaded with caption:", { mediaId: featuredMediaId, caption: imageCaption });
            } else {
              console.log("[Publish] ✓ Image uploaded:", { mediaId: featuredMediaId, url: featuredImageUrl });
            }
          } else {
            const errorText = await mediaResponse.text();
            console.error("[Publish] ✗ Image upload failed:", mediaResponse.status, errorText);
          }
        } catch (imgError) {
          console.error("[Publish] Image upload error:", imgError);
        }
      }

      console.log("[Publish] Received tags:", tags, "categories:", categories);
      
      // Handle tags: can be strings (custom), numbers (existing IDs), or objects {id, name}
      const tagIds: number[] = [];
      const createdTagMap: Record<number, string> = {}; // Track tag names for all tags
      
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (typeof tag === 'string') {
            // Custom tag name - create it on WordPress
            try {
              const createTagRes = await fetch(`${site.apiUrl}/wp/v2/tags`, {
                method: "POST",
                headers: {
                  Authorization: `Basic ${auth}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ name: tag })
              });
              
              if (createTagRes.ok) {
                const tagData = await createTagRes.json();
                tagIds.push(tagData.id);
                createdTagMap[tagData.id] = tag;
                console.log("[Publish] ✓ Created tag:", { id: tagData.id, name: tag });
              } else {
                console.warn("[Publish] ⚠ Failed to create tag:", tag, createTagRes.status);
              }
            } catch (tagErr) {
              console.error("[Publish] Tag creation error:", tagErr);
            }
          } else if (typeof tag === 'object' && tag.id) {
            // New format from frontend: {id, name}
            tagIds.push(tag.id);
            if (tag.name) createdTagMap[tag.id] = tag.name; // Store the name if provided
          } else if (typeof tag === 'number' && tag > 0) {
            // Old format or direct ID
            tagIds.push(tag);
          }
        }
      }
      
      let allTagIds = [...tagIds];
      
      const postData: any = {
        title,
        content,
        status: "publish",
        categories: Array.isArray(categories) ? categories : [],
        tags: allTagIds  // Send all numeric tag IDs (existing + newly created)
      };
      
      console.log("[Publish] ✓ Posting to WordPress with:", { 
        tagIds: postData.tags, 
        categoryIds: postData.categories,
        title: postData.title,
        hasFeaturedMedia: !!featuredMediaId,
        tagNames: createdTagMap
      });
      
      if (featuredMediaId) postData.featured_media = featuredMediaId;

      const wpResponse = await fetch(`${site.apiUrl}/wp/v2/posts`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(postData)
      });

      if (!wpResponse.ok) {
        const error = await wpResponse.text();
        return res.status(wpResponse.status).json({ error: "Failed to publish" });
      }

      const wpPost = await wpResponse.json();

      // If we didn't already get the featured image URL, fetch it now
      if (featuredMediaId && !featuredImageUrl) {
        try {
          console.log("[Publish] Fetching media data for ID:", featuredMediaId);
          const mediaRes = await fetch(`${site.apiUrl}/wp/v2/media/${featuredMediaId}`, {
            headers: { Authorization: `Basic ${auth}` }
          });
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            featuredImageUrl = mediaData.source_url;
            console.log("[Publish] Fetched media URL:", featuredImageUrl);
          } else {
            console.error("[Publish] Failed to fetch media data:", mediaRes.status);
          }
        } catch (e) {
          console.error("[Publish] Error fetching media data:", e);
        }
      }

      const wpLink = wpPost.link || wpPost.guid || `${site.url}?p=${wpPost.id}`;
      
      await createArticlePublishing({
        articleId: articleId as string,
        siteId: sid,
        wpPostId: String(wpPost.id),
        status: "published"
      });

      // Store tags with their names for reliable display (some tags may not be in WordPress API response)
      const tagsWithNames: any[] = allTagIds.map(id => ({
        id,
        name: createdTagMap[id] || `Tag ${id}` // Use created name if available, else use ID as fallback
      }));
      
      console.log("[Publish] Updating article with:", { featuredImageUrl, categories, tagsWithNames });
      console.log("[Publish] DEBUG: About to store tags, type:", typeof tagsWithNames, "value:", JSON.stringify(tagsWithNames));
      
      const updateResult = await updateArticle(articleId as string, {
        status: 'published',
        publishedAt: new Date(),
        siteId: sid,
        featuredImageUrl,
        categories,
        tags: tagsWithNames  // Store with names for reliable display
      });
      
      console.log("[Publish] DEBUG: After update, tags in article:", updateResult?.tags, "type:", typeof updateResult?.tags);

      console.log("[Publish] ✓ Article published successfully:", { wpPostId: wpPost.id, wpLink, featuredImageUrl, tags: tagsWithNames });
      res.json({ success: true, wpPostId: wpPost.id, url: wpPost.link, wpLink: wpLink, featuredImageUrl });
    }
    else {
      res.status(400).json({ error: "Invalid type" });
    }
  } catch (error: any) {
    console.error("Content error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
