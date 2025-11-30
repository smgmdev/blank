import { VercelRequest, VercelResponse } from "@vercel/node";
import { getArticlesByUserId, createArticle } from "./db-utils.js";
import { insertArticleSchema } from "../shared/schema.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "GET") {
    try {
      const userId = req.headers["x-user-id"] as string;
      
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const articles = await getArticlesByUserId(userId);
      res.json(articles);
    } catch (error: any) {
      console.error("Articles error:", error.message, error.stack);
      res.status(500).json({ error: "Failed to fetch articles", details: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const parsed = insertArticleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const article = await createArticle(parsed.data);
      res.json(article);
    } catch (error: any) {
      console.error("Article creation error:", error.message);
      res.status(500).json({ error: "Failed to create article", details: error.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
};
