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
        console.log(`[WP Auth] Invalid credentials for ${wpUsername}`);
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
