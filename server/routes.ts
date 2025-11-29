import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWordPressSiteSchema, insertAppUserSchema, insertArticleSchema } from "@shared/schema";

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
