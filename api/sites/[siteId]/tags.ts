import { VercelRequest, VercelResponse } from "@vercel/node";
import { getWordPressSiteById, getUserSiteCredential } from "../db-utils";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    
    const { siteId } = req.query;
    const { userId, tagName } = req.body;

    if (!tagName) return res.status(400).json({ error: "Tag name required" });
    if (!userId) return res.status(400).json({ error: "userId required" });

    const site = await getWordPressSiteById(siteId as string);
    if (!site) return res.status(404).json({ error: "Site not found" });

    const credential = await getUserSiteCredential(userId as string, siteId as string);
    if (!credential || !credential.isVerified) {
      return res.status(403).json({ error: "Not authenticated to this site" });
    }

    const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
    const tagResponse = await fetch(`${site.apiUrl}/wp/v2/tags`, {
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
};
