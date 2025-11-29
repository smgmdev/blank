import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWordPressSiteSchema, insertAppUserSchema, insertArticleSchema, insertUserSiteCredentialSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // WordPress Sites Routes (Admin)
  app.post("/api/sites", async (req, res) => {
    try {
      const parsed = insertWordPressSiteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const site = await storage.createWordPressSite(parsed.data);
      res.json(site);
    } catch (error) {
      res.status(500).json({ error: "Failed to create WordPress site" });
    }
  });

  app.get("/api/sites", async (req, res) => {
    try {
      const sites = await storage.getAllWordPressSites();
      res.json(sites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sites" });
    }
  });

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
      
      // Verify published articles still exist on WordPress (sync check)
      for (const article of articles) {
        if (article.status === 'published') {
          try {
            const publishing = await storage.getArticlePublishingByArticleId(article.id);
            if (publishing.length > 0) {
              const pub = publishing[0];
              const site = await storage.getWordPressSite(pub.siteId);
              
              if (site && pub.wpPostId && site.adminUsername) {
                // Make sure wpPostId is treated as integer for the URL
                const postId = parseInt(pub.wpPostId, 10);
                const checkUrl = `${site.apiUrl}/wp/v2/posts/${postId}`;
                
                try {
                  // Use admin username with application password token
                  const auth = Buffer.from(`${site.adminUsername}:${site.apiToken}`).toString("base64");
                  const checkRes = await fetch(checkUrl, {
                    headers: { Authorization: `Basic ${auth}` }
                  });
                  
                  console.log(`Sync check for article ${article.id} (WP post ${postId}): ${checkRes.status}`);
                  
                  // If post deleted on WordPress (404 or 400 - bad request could mean deleted), delete from app
                  if (checkRes.status === 404 || checkRes.status === 400) {
                    try {
                      const errorData = await checkRes.json();
                      console.log(`Error response:`, errorData);
                      // Check if it's a "not found" type error
                      if (checkRes.status === 404 || (errorData.code && (errorData.code.includes('not_found') || errorData.code === 'rest_post_invalid_id'))) {
                        console.log(`Deleting article ${article.id} - not found on WordPress`);
                        await storage.deleteArticle(article.id);
                      }
                    } catch (e) {
                      // If 404, assume it's deleted
                      if (checkRes.status === 404) {
                        console.log(`Deleting article ${article.id} - 404 response`);
                        await storage.deleteArticle(article.id);
                      }
                    }
                  }
                } catch (fetchError) {
                  console.error(`Fetch error for post ${postId}:`, fetchError);
                }
              }
            }
          } catch (error) {
            console.error("Sync check error:", error);
            // Silent fail - don't break the fetch
          }
        }
      }
      
      // Re-fetch after potential sync deletions
      const syncedArticles = await storage.getAllArticles();
      res.json(syncedArticles);
    } catch (error) {
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

      // Check if user already has credentials for this site
      const existing = await storage.getUserSiteCredential(userId, siteId);
      if (existing) {
        res.json({ success: true, message: "You are already authenticated to this site" });
        return;
      }

      // Store credentials
      const credential = await storage.createUserSiteCredential({
        userId,
        siteId,
        wpUsername,
        wpPassword,
      });

      // Mark as verified with actual WP user ID
      await storage.updateUserSiteCredentialVerification(credential.id, String(wpUser.id));

      // Create publishing profile
      const profile = await storage.createPublishingProfile({
        userId,
        siteId,
        credentialId: credential.id,
      });

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

  // Get WordPress categories for a site
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

  // Get WordPress tags for a site
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

  // Publish article to WordPress
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
      
      let featuredMediaId = null;
      
      // Upload featured image if provided
      if (featuredImageBase64) {
        try {
          const base64Data = featuredImageBase64.split(',')[1] || featuredImageBase64;
          const imageBuffer = Buffer.from(base64Data, 'base64');
          const mediaUrl = `${site.apiUrl}/wp/v2/media`;
          
          // Detect image type from base64 header (data URL format)
          let contentType = "image/jpeg";
          if (featuredImageBase64.includes("data:image/png")) {
            contentType = "image/png";
          } else if (featuredImageBase64.includes("data:image/webp")) {
            contentType = "image/webp";
          } else if (featuredImageBase64.includes("data:image/gif")) {
            contentType = "image/gif";
          }
          
          // Send image as binary with proper headers
          const mediaResponse = await fetch(mediaUrl, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": contentType
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

  // Login Route
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
