import { VercelRequest, VercelResponse } from "@vercel/node";
import { getWordPressSiteById, getUserSiteCredential, getArticleById, updateArticle, createArticlePublishing } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const articleId = Array.isArray(req.query.articleId) ? req.query.articleId[0] : req.query.articleId;
    const { siteId, userId, title, content, categories, tags, featuredImageBase64 } = req.body;

    if (!articleId || !siteId || !userId) {
      return res.status(400).json({ error: "articleId, siteId, and userId required" });
    }

    const site = await getWordPressSiteById(siteId);
    if (!site) return res.status(404).json({ error: "Site not found" });

    const credential = await getUserSiteCredential(userId, siteId);
    if (!credential || !credential.isVerified) {
      return res.status(403).json({ error: "Not authenticated to this site" });
    }

    const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
    const adminAuth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
    
    let featuredMediaId = null;
    
    // Upload featured image if provided
    if (featuredImageBase64) {
      try {
        const base64Data = featuredImageBase64.split(',')[1] || featuredImageBase64;
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const mediaUrl = `${site.apiUrl}/wp/v2/media`;
        
        let contentType = "image/jpeg";
        let extension = "jpg";
        if (featuredImageBase64.includes("data:image/png")) {
          contentType = "image/png";
          extension = "png";
        } else if (featuredImageBase64.includes("data:image/webp")) {
          contentType = "image/webp";
          extension = "webp";
        } else if (featuredImageBase64.includes("data:image/gif")) {
          contentType = "image/gif";
          extension = "gif";
        }
        
        const mediaResponse = await fetch(mediaUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${adminAuth}`,
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="featured-image.${extension}"`
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

    const postUrl = `${site.apiUrl}/wp/v2/posts`;
    const postData = {
      title,
      content,
      status: "publish",
      categories: Array.isArray(categories) ? categories : [],
      tags: Array.isArray(tags) ? tags : []
    };
    
    if (featuredMediaId) {
      postData.featured_media = featuredMediaId;
    }

    const wpResponse = await fetch(postUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(postData)
    });

    if (!wpResponse.ok) {
      const error = await wpResponse.text();
      console.error("WordPress publish error:", error);
      return res.status(wpResponse.status).json({ error: "Failed to publish to WordPress" });
    }

    const wpPost = await wpResponse.json();

    let featuredImageUrl = null;
    if (featuredMediaId) {
      try {
        const mediaUrl = `${site.apiUrl}/wp/v2/media/${featuredMediaId}`;
        const mediaRes = await fetch(mediaUrl, {
          headers: { Authorization: `Basic ${auth}` }
        });
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          featuredImageUrl = mediaData.source_url;
        }
      } catch (e) {
        console.error("Failed to fetch featured image URL:", e);
      }
    }

    // Save publishing record
    await createArticlePublishing({
      articleId,
      siteId,
      wpPostId: String(wpPost.id),
      status: "published"
    });

    // Update article status
    await updateArticle(articleId, {
      status: "published",
      siteId,
      featuredImageUrl,
      categories: Array.isArray(categories) ? categories : [],
      tags: Array.isArray(tags) ? tags : [],
      publishedAt: new Date()
    });

    res.json({ success: true, wpPostId: wpPost.id, wpLink: `${site.url}/?p=${wpPost.id}` });
  } catch (error: any) {
    console.error("Publish error:", error.message);
    res.status(500).json({ error: "Failed to publish article", details: error.message });
  }
};
