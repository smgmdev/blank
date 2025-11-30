import { VercelRequest, VercelResponse } from "@vercel/node";
import { getWordPressSiteById, getUserSiteCredential, getArticleById, createArticle, updateArticle, createArticlePublishing } from "./db-utils.js";
import { insertArticleSchema } from "../shared/schema.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { type, userId, siteId, articleId } = req.query;

    // /api/articles - GET articles or POST new article
    if (!type || type === "articles") {
      if (req.method === "GET") {
        const userIdHeader = req.headers["x-user-id"] as string;
        if (!userIdHeader) return res.status(401).json({ error: "User ID required" });
        
        const articles = await (await import("./db-utils.js")).getArticlesByUserId(userIdHeader);
        res.json(articles);
      } else if (req.method === "POST") {
        const parsed = insertArticleSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
        
        const article = await createArticle(parsed.data);
        res.json(article);
      } else {
        res.status(405).json({ error: "Method not allowed" });
      }
    }
    // /api/categories?userId=...&siteId=...
    else if (type === "categories") {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      if (!userId || !siteId) return res.status(400).json({ error: "userId and siteId required" });
      
      const site = await getWordPressSiteById(siteId as string);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await getUserSiteCredential(userId as string, siteId as string);
      if (!credential || !credential.isVerified) return res.status(403).json({ error: "Not authenticated" });

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      const response = await fetch(`${site.apiUrl}/wp/v2/categories?per_page=100`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch categories" });

      const categories = await response.json();
      res.json(categories.map((cat: any) => ({ id: cat.id, name: cat.name })));
    }
    // /api/tags?userId=...&siteId=...
    else if (type === "tags") {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      if (!userId || !siteId) return res.status(400).json({ error: "userId and siteId required" });
      
      const site = await getWordPressSiteById(siteId as string);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await getUserSiteCredential(userId as string, siteId as string);
      if (!credential || !credential.isVerified) return res.status(403).json({ error: "Not authenticated" });

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      const response = await fetch(`${site.apiUrl}/wp/v2/tags?per_page=100`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch tags" });

      const tags = await response.json();
      res.json(tags.map((tag: any) => ({ id: tag.id, name: tag.name })));
    }
    // /api/publish?articleId=...
    else if (type === "publish") {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      if (!articleId) return res.status(400).json({ error: "articleId required" });

      const { siteId: sid, userId: uid, title, content, categories, tags, featuredImageBase64 } = req.body;
      if (!sid || !uid) return res.status(400).json({ error: "siteId and userId required" });

      const site = await getWordPressSiteById(sid);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await getUserSiteCredential(uid, sid);
      if (!credential || !credential.isVerified) return res.status(403).json({ error: "Not authenticated" });

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      const adminAuth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
      
      let featuredMediaId = null;
      if (featuredImageBase64) {
        try {
          const base64Data = featuredImageBase64.split(',')[1] || featuredImageBase64;
          const imageBuffer = Buffer.from(base64Data, 'base64');
          let ext = "jpg", ct = "image/jpeg";
          if (featuredImageBase64.includes("png")) { ext = "png"; ct = "image/png"; }
          else if (featuredImageBase64.includes("webp")) { ext = "webp"; ct = "image/webp"; }
          else if (featuredImageBase64.includes("gif")) { ext = "gif"; ct = "image/gif"; }
          
          const mediaResponse = await fetch(`${site.apiUrl}/wp/v2/media`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${adminAuth}`,
              "Content-Type": ct,
              "Content-Disposition": `attachment; filename="featured-image.${ext}"`
            },
            body: imageBuffer
          });
          
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            featuredMediaId = mediaData.id;
          }
        } catch (imgError) {
          console.error("Image upload error:", imgError);
        }
      }

      const postData: any = {
        title,
        content,
        status: "publish",
        categories: Array.isArray(categories) ? categories : [],
        tags: Array.isArray(tags) ? tags : []
      };
      
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

      let featuredImageUrl = null;
      if (featuredMediaId) {
        try {
          const mediaRes = await fetch(`${site.apiUrl}/wp/v2/media/${featuredMediaId}`, {
            headers: { Authorization: `Basic ${auth}` }
          });
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            featuredImageUrl = mediaData.source_url;
          }
        } catch (e) {}
      }

      await createArticlePublishing({
        articleId: articleId as string,
        siteId: sid,
        wpPostId: String(wpPost.id),
        status: "published"
      });

      await updateArticle(articleId as string, {
        status: 'published',
        publishedAt: new Date(),
        siteId: sid,
        featuredImageUrl,
        categories,
        tags
      });

      res.json({ success: true, wpPostId: wpPost.id, url: wpPost.link, featuredImageUrl });
    }
    else {
      res.status(400).json({ error: "Invalid type" });
    }
  } catch (error: any) {
    console.error("Content error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
