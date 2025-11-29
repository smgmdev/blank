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
      res.json(articles);
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
      await storage.deleteArticle(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete article" });
    }
  });

  // WordPress Site User Authentication
  app.post("/api/users/:userId/sites/:siteId/authenticate", async (req, res) => {
    try {
      const { wpUsername, wpPassword } = req.body;
      const { userId, siteId } = req.params;

      if (!wpUsername || !wpPassword) {
        return res.status(400).json({ error: "WordPress credentials required" });
      }

      // Get site
      const site = await storage.getWordPressSite(siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      // Verify WordPress credentials by calling WordPress API
      try {
        const apiUrl = `${site.apiUrl}/wp/v2/users/me`;
        console.log(`[WP Auth] Authenticating ${wpUsername} at ${apiUrl}`);

        // Try with user credentials (Application Password or Basic Auth)
        const userAuth = Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");
        const userResponse = await fetch(apiUrl, {
          headers: { 
            Authorization: `Basic ${userAuth}`,
            "Content-Type": "application/json"
          },
        });

        console.log(`[WP Auth] User auth response: ${userResponse.status}`);

        // If user auth fails, try with site's admin token to at least verify the site is connected
        if (!userResponse.ok) {
          console.log(`[WP Auth] User auth failed, verifying site connection with admin token`);
          
          const adminAuth = Buffer.from(`admin:${site.apiToken}`).toString("base64");
          const adminResponse = await fetch(apiUrl, {
            headers: { 
              Authorization: `Basic ${adminAuth}`,
              "Content-Type": "application/json"
            },
          });

          if (!adminResponse.ok) {
            return res.status(401).json({
              error: "WordPress site authentication failed",
              hint: "Check that your WordPress site has REST API enabled and the API token is correct. Use Application Passwords (WordPress REST API) for best compatibility."
            });
          }

          // Admin credentials work but user credentials don't - user hasn't been granted access
          return res.status(401).json({
            error: "Your WordPress credentials are invalid or you don't have publishing access",
            hint: "Ask your WordPress admin to create an Application Password for you or verify your username/password"
          });
        }

        const wpUser = await userResponse.json();
        console.log(`[WP Auth] Successfully authenticated as user ID: ${wpUser.id}`);

        // Store credentials
        const credential = await storage.createUserSiteCredential({
          userId,
          siteId,
          wpUsername,
          wpPassword,
        });

        // Verify and update with WP user ID
        await storage.updateUserSiteCredentialVerification(credential.id, String(wpUser.id));

        // Create publishing profile
        const profile = await storage.createPublishingProfile({
          userId,
          siteId,
          credentialId: credential.id,
        });

        res.json({ success: true, profile });
      } catch (error: any) {
        console.error(`[WP Auth] Error:`, error.message);
        res.status(500).json({ 
          error: "Failed to authenticate with WordPress",
          details: error.message
        });
      }
    } catch (error: any) {
      console.error(`[WP Auth] Auth error:`, error.message);
      res.status(500).json({ error: "Failed to authenticate" });
    }
  });

  // Test WordPress site connection
  app.post("/api/sites/:siteId/test-connection", async (req, res) => {
    try {
      const { siteId } = req.params;
      
      const site = await storage.getWordPressSite(siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      const apiUrl = `${site.apiUrl}/wp/v2/users/me`;
      const auth = Buffer.from(`admin:${site.apiToken}`).toString("base64");

      const response = await fetch(apiUrl, {
        headers: { 
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        },
      });

      if (response.ok) {
        const wpUser = await response.json();
        await storage.updateWordPressSiteConnection(siteId, true);
        res.json({ 
          success: true, 
          message: "WordPress site is connected and accessible",
          wpUser: wpUser.name
        });
      } else {
        res.status(400).json({
          success: false,
          error: `WordPress API returned ${response.status}`,
          hint: "Verify that the API URL and token are correct"
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        hint: "Failed to reach WordPress site. Check the API URL and ensure the site is accessible."
      });
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
