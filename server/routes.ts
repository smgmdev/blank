import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWordPressSiteSchema, insertAppUserSchema, insertArticleSchema, insertUserSiteCredentialSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health Check
  app.get("/api/health", async (req, res) => {
    try {
      const users = await storage.getAllAppUsers();
      res.json({ 
        status: "ok", 
        database: "connected",
        usersCount: users.length,
        users: users.map(u => ({ id: u.id, username: u.username }))
      });
    } catch (error: any) {
      res.status(500).json({ 
        status: "error", 
        database: "disconnected",
        error: error.message 
      });
    }
  });

  // WordPress Sites Routes (Admin) - Old handlers removed - now consolidated below

  // Keep site by ID routes (these use :id param, not query params)
  app.get("/api/sites/:id", async (req, res) => {
    try {
      const site = await storage.getWordPressSite(req.params.id);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json(site);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch site" });
    }
  });

  app.delete("/api/sites/:id", async (req, res) => {
    try {
      await storage.deleteWordPressSite(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete site" });
    }
  });

  app.post("/api/sites/:id/connect", async (req, res) => {
    try {
      const { apiUrl, apiToken } = req.body;
      if (!apiUrl || !apiToken) {
        return res.status(400).json({ error: "apiUrl and apiToken required" });
      }
      // TODO: Test WordPress connection
      await storage.updateWordPressSiteConnection(req.params.id, true);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to connect site" });
    }
  });

  // Users Routes (Admin)
  app.post("/api/users", async (req, res) => {
    try {
      const parsed = insertAppUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const user = await storage.createAppUser(parsed.data);
      res.json(user);
    } catch (error: any) {
      if (error.message.includes("unique")) {
        return res.status(400).json({ error: "Username already exists" });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllAppUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users/:id/profiles", async (req, res) => {
    try {
      const { siteId } = req.body;
      if (!siteId) {
        return res.status(400).json({ error: "siteId required" });
      }
      const profile = await storage.createPublishingProfile({
        userId: req.params.id,
        siteId,
      });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to create publishing profile" });
    }
  });

  app.get("/api/users/:id/profiles", async (req, res) => {
    try {
      const profiles = await storage.getPublishingProfilesByUserId(
        req.params.id
      );
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profiles" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await storage.deleteAppUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Articles Routes
  app.post("/api/articles", async (req, res) => {
    try {
      const parsed = insertArticleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const article = await storage.createArticle(parsed.data);
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: "Failed to create article" });
    }
  });

  app.get("/api/articles", async (req, res) => {
    try {
      const articles = await storage.getAllArticles();
      res.json(articles);
    } catch (error) {
      console.error("Articles fetch error:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/:id", async (req, res) => {
    try {
      const article = await storage.getArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  app.patch("/api/articles/:id", async (req, res) => {
    try {
      await storage.updateArticle(req.params.id, req.body);
      const article = await storage.getArticle(req.params.id);
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: "Failed to update article" });
    }
  });

  app.delete("/api/articles/:id", async (req, res) => {
    try {
      const articleId = req.params.id;
      
      // Get publishing info to find WordPress post
      const publishing = await storage.getArticlePublishingByArticleId(articleId);
      
      // Delete from WordPress if published
      if (publishing.length > 0) {
        for (const pub of publishing) {
          try {
            const site = await storage.getWordPressSite(pub.siteId);
            const credential = await storage.getUserSiteCredential(req.body?.userId || '', pub.siteId);
            
            if (site && credential) {
              const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
              const deleteUrl = `${site.apiUrl}/wp/v2/posts/${pub.wpPostId}?force=true`;
              
              await fetch(deleteUrl, {
                method: "DELETE",
                headers: { Authorization: `Basic ${auth}` }
              });
            }
          } catch (wpError) {
            console.error("WordPress deletion error:", wpError);
            // Continue deleting from app even if WP deletion fails
          }
        }
      }
      
      // Delete article from app
      await storage.deleteArticle(articleId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete article" });
    }
  });

  app.get("/api/articles/:articleId/publishing", async (req, res) => {
    try {
      const publishing = await storage.getArticlePublishingByArticleId(req.params.articleId);
      if (publishing.length === 0) {
        return res.status(404).json({ error: "No publishing record found" });
      }
      const site = await storage.getWordPressSite(publishing[0].siteId);
      res.json({ wpLink: `${site?.url}/?p=${publishing[0].wpPostId}` });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch publishing data" });
    }
  });

  // WordPress Site User Authentication (Validate credentials in real-time)
  app.post("/api/users/:userId/sites/:siteId/authenticate", async (req, res) => {
    try {
      const { wpUsername, wpPassword } = req.body;
      const { userId, siteId } = req.params;

      if (!wpUsername || !wpPassword) {
        return res.status(400).json({ error: "WordPress username and password required" });
      }

      // Get site
      const site = await storage.getWordPressSite(siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      // Site must be connected first
      if (!site.isConnected) {
        return res.status(403).json({
          error: "Site not verified",
          hint: "Admin must verify the WordPress site connection first"
        });
      }

      // SECURITY: Validate credentials against WordPress REST API
      console.log(`[WP Auth] Validating ${wpUsername} credentials at ${site.apiUrl}`);
      
      const apiUrl = `${site.apiUrl}/wp/v2/users/me`;
      const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");
      
      const wpResponse = await fetch(apiUrl, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        },
      });

      console.log(`[WP Auth] WordPress validation response: ${wpResponse.status}`);

      if (!wpResponse.ok) {
        const errorBody = await wpResponse.text();
        console.log(`[WP Auth] Invalid credentials for ${wpUsername}: ${errorBody}`);
        
        // Check if it's a 401 - likely Basic Auth not enabled
        if (wpResponse.status === 401) {
          return res.status(401).json({
            error: "Authentication failed",
            hint: "Admin needs to install a Basic Authentication plugin. Try 'REST API Authentication for WP' by miniOrange or 'Basic Authentication (REST API)' by Alain Schlesser, then activate it and try again."
          });
        }
        
        return res.status(401).json({
          error: "Invalid WordPress credentials",
          hint: "Your WordPress username or password is incorrect"
        });
      }

      const wpUser = await wpResponse.json();
      console.log(`[WP Auth] User ${wpUsername} verified as WP user ID: ${wpUser.id}`);

      // Upsert credentials (create or update if already exists)
      const credential = await storage.upsertUserSiteCredential({
        userId,
        siteId,
        wpUsername,
        wpPassword,
      });

      // Mark as verified with actual WP user ID
      await storage.updateUserSiteCredentialVerification(credential.id, String(wpUser.id));

      // Check if publishing profile already exists
      const existingProfiles = await storage.getPublishingProfilesByUserId(userId);
      let profile = existingProfiles.find(p => p.siteId === siteId);
      
      if (!profile) {
        // Create publishing profile if it doesn't exist
        profile = await storage.createPublishingProfile({
          userId,
          siteId,
          credentialId: credential.id,
        });
      }

      res.json({ 
        success: true, 
        message: "Authenticated successfully. You can now publish to this site.",
        profile 
      });
    } catch (error: any) {
      console.error(`[WP Auth] Auth error:`, error.message);
      res.status(500).json({ error: "Failed to authenticate with WordPress" });
    }
  });

  // Test & Verify WordPress site connection (Admin only)
  app.post("/api/sites/:siteId/verify-connection", async (req, res) => {
    try {
      const { siteId } = req.params;
      const { adminUsername, adminPassword } = req.body;
      
      const site = await storage.getWordPressSite(siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      if (!adminUsername || !adminPassword) {
        return res.status(400).json({ error: "Admin credentials required" });
      }

      const apiUrl = `${site.apiUrl}/wp/v2/users/me`;
      console.log(`[Site Verify] Testing connection with admin credentials at ${apiUrl}`);

      // Try with provided admin credentials
      const auth = Buffer.from(`${adminUsername}:${adminPassword}`).toString("base64");
      const response = await fetch(apiUrl, {
        headers: { 
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        },
      });

      console.log(`[Site Verify] Response status: ${response.status}`);

      if (response.ok) {
        const wpUser = await response.json();
        // Mark site as connected
        await storage.updateWordPressSiteConnection(siteId, true);
        console.log(`[Site Verify] Site verified successfully as admin user: ${wpUser.name}`);
        
        res.json({ 
          success: true, 
          message: `✓ WordPress site verified and connected as ${wpUser.name}`,
          wpUser: { id: wpUser.id, name: wpUser.name }
        });
      } else {
        const errorText = await response.text();
        console.log(`[Site Verify] Verification failed: ${errorText}`);
        
        res.status(400).json({
          success: false,
          error: `WordPress API returned ${response.status}`,
          hint: `Verify that:
          1. API URL is correct: ${site.apiUrl}
          2. Admin username/password are valid
          3. WordPress site has Application Passwords enabled
          4. The account has API access permissions`
        });
      }
    } catch (error: any) {
      console.error(`[Site Verify] Error:`, error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        hint: "Failed to reach WordPress site. Ensure the site is accessible and API is enabled."
      });
    }
  });

  // Get sites with user's personal auth status
  app.get("/api/users/:userId/sites-with-auth", async (req, res) => {
    try {
      const { userId } = req.params;
      const sites = await storage.getAllWordPressSites();
      
      // For each site, check if user is authenticated
      const sitesWithAuth = await Promise.all(
        sites.map(async (site) => {
          const credential = await storage.getUserSiteCredential(userId, site.id);
          return {
            ...site,
            userIsConnected: !!credential && credential.isVerified
          };
        })
      );

      res.json(sitesWithAuth);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sites" });
    }
  });

  // Get sites with user auth status (query-based for Vercel compatibility)
  app.get("/api/user-sites", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const sites = await storage.getAllWordPressSites();
      
      const sitesWithAuth = await Promise.all(
        sites.map(async (site) => {
          const credential = await storage.getUserSiteCredential(userId, site.id);
          return {
            ...site,
            userIsConnected: !!credential && credential.isVerified,
            hasCredentials: !!credential
          };
        })
      );

      res.json(sitesWithAuth);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch sites", details: error.message });
    }
  });

  // Disconnect user from site (remove credentials)
  app.post("/api/users/:userId/sites/:siteId/disconnect", async (req, res) => {
    try {
      const { userId, siteId } = req.params;
      
      // Get and delete user's credentials
      const credential = await storage.getUserSiteCredential(userId, siteId);
      if (credential) {
        // Delete any publishing profiles for this user+site
        const profiles = await storage.getPublishingProfilesBySiteId(siteId);
        for (const profile of profiles) {
          if (profile.userId === userId) {
            await storage.deletePublishingProfile(profile.id);
          }
        }
        // Delete the credential
        await storage.deleteUserSiteCredential(credential.id);
      }

      res.json({ success: true, message: "Disconnected from site" });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  // Get user's publishing profiles with site info
  app.get("/api/users/:userId/publishing-profiles", async (req, res) => {
    try {
      const profiles = await storage.getPublishingProfilesByUserId(
        req.params.userId
      );
      
      const enriched = await Promise.all(
        profiles.map(async (profile) => {
          const site = await storage.getWordPressSite(profile.siteId);
          return { ...profile, site };
        })
      );

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch publishing profiles" });
    }
  });

  // Get WordPress categories (query-param based for Vercel compatibility)
  app.get("/api/categories", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const siteId = req.query.siteId as string;

      if (!userId || !siteId) {
        return res.status(400).json({ error: "userId and siteId required" });
      }

      const site = await storage.getWordPressSite(siteId);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await storage.getUserSiteCredential(userId, siteId);
      if (!credential || !credential.isVerified) {
        return res.status(403).json({ error: "Not authenticated to this site" });
      }

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      const apiUrl = `${site.apiUrl}/wp/v2/categories?per_page=100`;
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch categories" });
      }

      const categories = await response.json();
      res.json(categories.map((cat: any) => ({ id: cat.id, name: cat.name })));
    } catch (error) {
      console.error("Categories fetch error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get WordPress categories for a site (path-based)
  app.get("/api/sites/:siteId/categories", async (req, res) => {
    try {
      const { siteId } = req.params;
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      const site = await storage.getWordPressSite(siteId);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await storage.getUserSiteCredential(userId, siteId);
      if (!credential || !credential.isVerified) {
        return res.status(403).json({ error: "Not authenticated to this site" });
      }

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      const apiUrl = `${site.apiUrl}/wp/v2/categories?per_page=100`;
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch categories" });
      }

      const categories = await response.json();
      res.json(categories.map((cat: any) => ({ id: cat.id, name: cat.name })));
    } catch (error) {
      console.error("Categories fetch error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get WordPress tags (query-param based for Vercel compatibility)
  app.get("/api/tags", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const siteId = req.query.siteId as string;

      if (!userId || !siteId) {
        return res.status(400).json({ error: "userId and siteId required" });
      }

      const site = await storage.getWordPressSite(siteId);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await storage.getUserSiteCredential(userId, siteId);
      if (!credential || !credential.isVerified) {
        return res.status(403).json({ error: "Not authenticated to this site" });
      }

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      const apiUrl = `${site.apiUrl}/wp/v2/tags?per_page=100`;
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch tags" });
      }

      const tags = await response.json();
      res.json(tags.map((tag: any) => ({ id: tag.id, name: tag.name })));
    } catch (error) {
      console.error("Tags fetch error:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // Get WordPress tags for a site (path-based)
  app.get("/api/sites/:siteId/tags", async (req, res) => {
    try {
      const { siteId } = req.params;
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      const site = await storage.getWordPressSite(siteId);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await storage.getUserSiteCredential(userId, siteId);
      if (!credential || !credential.isVerified) {
        return res.status(403).json({ error: "Not authenticated to this site" });
      }

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      const apiUrl = `${site.apiUrl}/wp/v2/tags?per_page=100`;
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch tags" });
      }

      const tags = await response.json();
      res.json(tags.map((tag: any) => ({ id: tag.id, name: tag.name })));
    } catch (error) {
      console.error("Tags fetch error:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // Create a new tag on WordPress
  app.post("/api/sites/:siteId/tags", async (req, res) => {
    try {
      const { siteId } = req.params;
      const { userId, tagName } = req.body;

      if (!tagName) {
        return res.status(400).json({ error: "Tag name required" });
      }

      const site = await storage.getWordPressSite(siteId);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await storage.getUserSiteCredential(userId, siteId);
      if (!credential || !credential.isVerified) {
        return res.status(403).json({ error: "Not authenticated to this site" });
      }

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      const tagUrl = `${site.apiUrl}/wp/v2/tags`;

      const tagResponse = await fetch(tagUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: tagName })
      });

      if (!tagResponse.ok) {
        const error = await tagResponse.text();
        console.error("WordPress tag creation error:", error);
        return res.status(tagResponse.status).json({ error: "Failed to create tag" });
      }

      const newTag = await tagResponse.json();
      res.json({ id: newTag.id, name: newTag.name });
    } catch (error: any) {
      console.error("Tag creation error:", error);
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  // Publish article to WordPress (query-param version for Vercel compatibility)
  app.post("/api/publish", async (req, res) => {
    try {
      const articleId = req.query.articleId as string;
      const { siteId, userId, title, content, categories, tags, featuredImageBase64 } = req.body;

      if (!articleId) {
        return res.status(400).json({ error: "articleId required in query" });
      }

      const site = await storage.getWordPressSite(siteId);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await storage.getUserSiteCredential(userId, siteId);
      if (!credential || !credential.isVerified) {
        return res.status(403).json({ error: "Not authenticated to this site" });
      }

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      const adminAuth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
      
      let featuredMediaId = null;
      
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

      await storage.createArticlePublishing({
        articleId,
        siteId,
        wpPostId: String(wpPost.id),
        status: "published"
      });

      await storage.updateArticle(articleId, {
        status: 'published',
        publishedAt: new Date(),
        siteId,
        featuredImageUrl,
        categories,
        tags
      });

      res.json({ success: true, wpPostId: wpPost.id, url: wpPost.link, featuredImageUrl });
    } catch (error: any) {
      console.error("Publish error:", error);
      res.status(500).json({ error: "Failed to publish article" });
    }
  });

  // Publish article to WordPress (path-param version)
  app.post("/api/articles/:articleId/publish-to-site", async (req, res) => {
    try {
      const { articleId } = req.params;
      const { siteId, userId, title, content, categories, tags, featuredImageBase64 } = req.body;

      const site = await storage.getWordPressSite(siteId);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const credential = await storage.getUserSiteCredential(userId, siteId);
      if (!credential || !credential.isVerified) {
        return res.status(403).json({ error: "Not authenticated to this site" });
      }

      const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
      
      // Use admin credentials for media upload (requires file upload permission)
      const adminAuth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
      
      let featuredMediaId = null;
      
      // Upload featured image if provided
      if (featuredImageBase64) {
        try {
          const base64Data = featuredImageBase64.split(',')[1] || featuredImageBase64;
          const imageBuffer = Buffer.from(base64Data, 'base64');
          const mediaUrl = `${site.apiUrl}/wp/v2/media`;
          
          // Detect image type and extension from base64 header (data URL format)
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
          
          console.log(`Uploading featured image with Content-Type: ${contentType}`);
          
          // Send image as binary with proper headers using admin credentials
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
            console.log(`Image uploaded successfully with ID: ${featuredMediaId}`);
          } else {
            const errorText = await mediaResponse.text();
            console.error(`Image upload failed: ${mediaResponse.status}`, errorText);
          }
        } catch (imgError) {
          console.error("Image upload error:", imgError);
          // Continue without featured image if upload fails
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

      // Fetch featured image URL if media was uploaded
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
      await storage.createArticlePublishing({
        articleId,
        siteId,
        wpPostId: String(wpPost.id),
        status: "published"
      });

      // Update article status to published with featured image, site ID, and metadata
      await storage.updateArticle(articleId, {
        status: 'published',
        publishedAt: new Date(),
        siteId,
        featuredImageUrl,
        categories,
        tags
      });

      res.json({ success: true, wpPostId: wpPost.id, url: wpPost.link, featuredImageUrl });
    } catch (error: any) {
      console.error("Publish error:", error);
      res.status(500).json({ error: "Failed to publish article" });
    }
  });

  // Sync/Refresh - Check for deleted articles on WordPress
  app.post("/api/sync-articles", async (req, res) => {
    try {
      const isManual = req.body?.manual === true;
      const articles = await storage.getAllArticles();
      let deletedCount = 0;
      const deletedIds: string[] = [];
      
      console.log(`[Sync] Starting sync - found ${articles.length} total articles`);
      const publishedArticles = articles.filter(a => a.status === 'published');
      console.log(`[Sync] Checking ${publishedArticles.length} published articles`);
      
      // Group articles by site
      const articlesBySite = new Map<string, any[]>();
      for (const article of publishedArticles) {
        const publishing = await storage.getArticlePublishingByArticleId(article.id);
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
      
      // For each site, fetch all published posts and compare
      for (const [siteId, siteArticles] of articlesBySite.entries()) {
        const site = await storage.getWordPressSite(siteId);
        if (!site) {
          console.log(`[Sync] Site ${siteId} not found - skipping`);
          continue;
        }
        
        console.log(`[Sync] Site: ${site.name} - checking ${siteArticles.length} articles`);
        
        try {
          // Setup auth headers once
          const headers: any = {};
          if (site.adminUsername && site.apiToken) {
            console.log(`[Sync] DEBUG: FULL apiToken: "${site.apiToken}"`);
            console.log(`[Sync] DEBUG: apiToken length: ${site.apiToken.length}`);
            const auth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
            headers.Authorization = `Basic ${auth}`;
            console.log(`[Sync] Using apiToken for Basic Auth with ${site.adminUsername}`);
            console.log(`[Sync] DEBUG: FULL Auth header: ${headers.Authorization}`);
          } else if (site.adminUsername && site.adminPassword) {
            console.log(`[Sync] DEBUG: FULL adminPassword: "${site.adminPassword}"`);
            console.log(`[Sync] DEBUG: adminPassword length: ${site.adminPassword.length}`);
            const auth = Buffer.from(`${site.adminUsername}:${site.adminPassword}`).toString("base64");
            headers.Authorization = `Basic ${auth}`;
            console.log(`[Sync] Using adminPassword for Basic Auth with ${site.adminUsername}`);
            console.log(`[Sync] DEBUG: FULL Auth header: ${headers.Authorization}`);
          }
          
          // Check each article with admin API
          console.log(`[Sync] Checking ${siteArticles.length} articles with admin API`);
          
          for (const { article, publishing } of siteArticles) {
            const postId = publishing.wpPostId;
            const checkUrl = `${site.apiUrl}/wp/v2/posts/${postId}`;
            
            try {
              const checkRes = await fetch(checkUrl, { headers });
              console.log(`[Sync] Checking ${checkUrl} - Status: ${checkRes.status}`);
              
              const data = await checkRes.json();
              console.log(`[Sync] Response data for post ${postId}:`, JSON.stringify(data).substring(0, 200));
              
              // Check for auth errors
              if (data?.error === "INVALID_PASSWORD" || data?.code === "rest_authentication_failed") {
                console.log(`[Sync] ⚠ Article "${article.title}" (post ${postId}): Auth error - SKIPPING (cannot verify)`);
                continue;
              }
              
              if (data?.id) {
                // Article found on WordPress - keep it
                console.log(`[Sync] ✓ Article "${article.title}" (post ${postId}): Found on WP`);
              } else {
                // Cannot find article on WordPress - delete it
                console.log(`[Sync] ✗ Article "${article.title}" (post ${postId}): Not found on WP - DELETING`);
                await storage.deleteArticle(article.id);
                deletedCount++;
                deletedIds.push(article.id);
              }
            } catch (checkError: any) {
              // Network error - cannot verify, skip
              console.log(`[Sync] ⚠ Article "${article.title}" (post ${postId}): Error fetching - ${checkError.message} - SKIPPING (cannot verify)`);
            }
          }
        } catch (siteError: any) {
          console.error(`[Sync] Error syncing site ${site.name}:`, siteError.message);
        }
      }
      
      const syncedArticles = await storage.getAllArticles();
      console.log(`[Sync] Complete: ${deletedCount} deleted, ${deletedIds.length} IDs`);
      res.json({ success: true, deletedCount, deletedIds, articles: syncedArticles });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to sync articles" });
    }
  });

  // Check session status (works for both Replit & Vercel)
  app.get("/api/auth/session", async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(401).json({ error: "No session" });
      }

      const session = await storage.getUserSession(sessionId as string);
      if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ error: "Session expired" });
      }

      const user = await storage.getAppUser(session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json({ id: user.id, email: user.email, role: user.role, sessionId });
    } catch (error) {
      res.status(500).json({ error: "Failed to check session" });
    }
  });

  // Consolidated Auth Endpoint (supports query parameter routing)
  app.post("/api/auth", async (req, res) => {
    const { action } = req.query;
    
    if (action === "login") {
      try {
        const { email, password } = req.body;
        if (!email || !password) {
          return res.status(400).json({ error: "Email and password required" });
        }

        const user = await storage.getAppUserByUsername(email);
        if (!user || user.password !== password) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // Try to create server-side session (7 days expiry)
        let sessionId = null;
        try {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          
          const session = await storage.createUserSession({
            userId: user.id,
            expiresAt
          });
          sessionId = session.id;
        } catch (sessionError) {
          // Session table might not exist yet, continue without it
          console.warn("[Auth] Session creation failed, continuing without server session");
        }

        res.json({
          id: user.id,
          email: user.email,
          role: user.role,
          sessionId: sessionId || user.id
        });
      } catch (error) {
        console.error("[Auth] Login error:", error);
        res.status(500).json({ error: "Failed to login" });
      }
    } else if (action === "logout") {
      try {
        const { sessionId } = req.body;
        if (sessionId) {
          await storage.clearUserSession(sessionId);
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to logout" });
      }
    } else if (action === "authenticate") {
      try {
        const { userId, siteId, wpUsername, wpPassword } = req.body;
        if (!userId || !siteId || !wpUsername || !wpPassword) {
          return res.status(400).json({ error: "All fields required" });
        }

        const site = await storage.getWordPressSite(siteId);
        if (!site) return res.status(404).json({ error: "Site not found" });

        const apiUrl = `${site.apiUrl}/wp/v2/users/me`;
        const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");
        
        const wpResponse = await fetch(apiUrl, {
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" }
        });

        if (!wpResponse.ok) {
          return res.status(401).json({ error: "WordPress authentication failed" });
        }

        // Save credentials (upsert to handle re-authentication)
        const credential = await storage.upsertUserSiteCredential({
          userId,
          siteId,
          wpUsername,
          wpPassword
        });
        
        // Mark as verified
        await storage.updateUserSiteCredentialVerification(credential.id, "1");

        res.json({ success: true, message: "Credentials saved" });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  });

  // Consolidated Sites Endpoint (supports query parameter routing)
  app.get("/api/sites", async (req, res) => {
    const { action, userId } = req.query;
    
    if (action === "user-sites" && userId) {
      try {
        const credentials = await storage.getUserSiteCredentialsByUserId(userId as string);
        const allSites = await storage.getAllWordPressSites();
        
        const sitesWithAuth = allSites.map(site => {
          const credential = credentials.find(c => c.siteId === site.id);
          return {
            ...site,
            userIsConnected: credential?.isVerified || false,
            hasCredentials: !!credential
          };
        });
        
        res.json(sitesWithAuth);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else {
      // Default: GET all sites
      try {
        const sites = await storage.getAllWordPressSites();
        res.json(sites);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post("/api/sites", async (req, res) => {
    const { action } = req.query;
    
    if (action === "disconnect") {
      try {
        const { userId, siteId } = req.body;
        if (!userId || !siteId) {
          return res.status(400).json({ error: "userId and siteId required" });
        }
        
        const credential = await storage.getUserSiteCredential(userId, siteId);
        if (credential) {
          await storage.deleteUserSiteCredential(credential.id);
        }
        
        res.json({ success: true, message: "Disconnected from site" });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else if (action === "update-credentials") {
      try {
        const { siteId, adminUsername, adminPassword, apiToken } = req.body;
        
        console.log(`[UpdateCreds] Received: siteId=${siteId}, username=${adminUsername}, password=${!!adminPassword}, token=${!!apiToken}`);
        
        if (!siteId || !adminUsername) {
          return res.status(400).json({ error: "siteId and adminUsername required" });
        }
        
        if (!adminPassword && !apiToken) {
          return res.status(400).json({ error: "Either adminPassword or apiToken required" });
        }
        
        // Get current site to preserve apiToken if not provided
        const site = await storage.getWordPressSite(siteId);
        if (!site) {
          return res.status(404).json({ error: "Site not found" });
        }
        
        const finalApiToken = apiToken || site.apiToken;
        
        console.log(`[UpdateCreds] Updating with: username=${adminUsername}, password=${!!adminPassword}, token=${!!finalApiToken}`);
        
        await storage.updateWordPressSiteAdminCredentials(siteId, adminUsername, adminPassword || site.adminPassword, finalApiToken);
        res.json({ success: true, message: "Admin credentials updated" });
      } catch (error: any) {
        console.error(`[UpdateCreds] Error:`, error.message);
        res.status(500).json({ error: error.message });
      }
    } else {
      // Default: Create new site (existing behavior)
      try {
        const parsed = insertWordPressSiteSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: parsed.error.flatten() });
        }
        const site = await storage.createWordPressSite(parsed.data);
        res.json(site);
      } catch (error: any) {
        res.status(500).json({ error: "Failed to create WordPress site" });
      }
    }
  });

  // Consolidated Content Endpoint (supports query parameter routing)
  app.get("/api/content", async (req, res) => {
    const { type, articleId, userId, siteId } = req.query;

    if (type === "categories" && userId && siteId) {
      try {
        const site = await storage.getWordPressSite(siteId as string);
        if (!site) return res.status(404).json({ error: "Site not found" });

        const credential = await storage.getUserSiteCredential(userId as string, siteId as string);
        if (!credential?.isVerified) return res.status(403).json({ error: "Not authenticated" });

        const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
        const response = await fetch(`${site.apiUrl}/wp/v2/categories?per_page=100`, {
          headers: { Authorization: `Basic ${auth}` }
        });
        
        if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch categories" });

        const categories = await response.json();
        res.json(categories.map((cat: any) => ({ id: cat.id, name: cat.name })));
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else if (type === "tags" && userId && siteId) {
      try {
        const site = await storage.getWordPressSite(siteId as string);
        if (!site) return res.status(404).json({ error: "Site not found" });

        const credential = await storage.getUserSiteCredential(userId as string, siteId as string);
        if (!credential?.isVerified) return res.status(403).json({ error: "Not authenticated" });

        const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
        const response = await fetch(`${site.apiUrl}/wp/v2/tags?per_page=100`, {
          headers: { Authorization: `Basic ${auth}` }
        });
        
        if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch tags" });

        const tags = await response.json();
        res.json(tags.map((tag: any) => ({ id: tag.id, name: tag.name })));
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else if (type === "articles") {
      try {
        if (articleId) {
          const article = await storage.getArticle(articleId as string);
          if (!article) return res.status(404).json({ error: "Article not found" });
          res.json(article);
        } else {
          const userIdHeader = req.headers["x-user-id"] as string;
          if (!userIdHeader) return res.status(401).json({ error: "User ID required" });
          
          const articles = await storage.getArticlesByUserId(userIdHeader);
          res.json(articles);
        }
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else if (type === "publishing" && articleId && siteId) {
      try {
        const publishing = await storage.getArticlePublishingByArticleId(articleId as string);
        const pub = publishing.find(p => p.siteId === siteId);
        if (!pub) return res.status(404).json({ error: "Publishing info not found" });
        
        const site = await storage.getWordPressSite(pub.siteId);
        res.json({ wpLink: `${site?.url}/?p=${pub.wpPostId}` });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Invalid query" });
    }
  });

  app.post("/api/content", async (req, res) => {
    const { type, articleId } = req.query;

    if (type === "articles") {
      try {
        if (articleId) {
          // Update existing article (PATCH via POST)
          try {
            const article = await storage.updateArticle(articleId as string, req.body);
            if (!article) return res.status(404).json({ error: "Article not found or update failed" });
            res.json(article);
          } catch (e: any) {
            console.error('Update article error:', e);
            return res.status(500).json({ error: e.message || "Failed to update article" });
          }
        } else {
          // Create new article
          const parsed = insertArticleSchema.safeParse(req.body);
          if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
          
          const article = await storage.createArticle(parsed.data);
          res.json(article);
        }
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else if (type === "publish") {
      // Proxy to Vercel publish handler
      try {
        const contentHandler = await import("../api/content.js");
        const mockVercelReq = {
          query: req.query,
          method: req.method,
          body: req.body,
          headers: req.headers,
          rawBody: req.rawBody
        } as any;
        const mockVercelRes = {
          status: (code: number) => ({
            json: (data: any) => res.status(code).json(data)
          }),
          json: (data: any) => res.json(data),
          statusCode: 200,
          setHeader: () => {}
        } as any;
        await contentHandler.default(mockVercelReq, mockVercelRes);
      } catch (error: any) {
        res.status(500).json({ error: "Publishing failed: " + error.message });
      }
    } else {
      res.status(400).json({ error: "Invalid type" });
    }
  });

  app.delete("/api/content", async (req, res) => {
    const { type, articleId } = req.query;

    if (type === "articles" && articleId) {
      try {
        await storage.deleteArticle(articleId as string);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // Legacy Login Route (for backward compat)
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getAppUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        companyName: user.companyName,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to login" });
    }
  });

  return httpServer;
}
