import { VercelRequest, VercelResponse } from "@vercel/node";
import { getWordPressSiteById, getUserSiteCredential } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = req.query.userId as string;
    const siteId = req.query.siteId as string;

    if (!userId || !siteId) {
      return res.status(400).json({ error: "userId and siteId required" });
    }

    const site = await getWordPressSiteById(siteId);
    if (!site) return res.status(404).json({ error: "Site not found" });

    const credential = await getUserSiteCredential(userId, siteId);
    if (!credential || !credential.isVerified) {
      return res.status(403).json({ error: "Not authenticated to this site" });
    }

    const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
    const apiUrl = `${site.apiUrl}/wp/v2/tags?per_page=100`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch tags" });
    }

    const tags = await response.json();
    res.json(tags.map((tag: any) => ({ id: tag.id, name: tag.name })));
  } catch (error: any) {
    console.error("Tags error:", error.message);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
};
