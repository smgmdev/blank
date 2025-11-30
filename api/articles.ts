import { VercelRequest, VercelResponse } from "@vercel/node";
import { getArticlesByUserId } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
};
