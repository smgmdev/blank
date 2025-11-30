import { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserSiteCredentialsByUserId, getWordPressSiteById } from "../api/db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Get user's first connected site
    const credentials = await getUserSiteCredentialsByUserId(userId);
    if (!credentials || credentials.length === 0) {
      return res.status(404).json({ error: "No WordPress sites connected" });
    }

    const cred = credentials[0];
    const site = await getWordPressSiteById(cred.siteId);
    if (!site) {
      return res.status(404).json({ error: "Site not found" });
    }

    const auth = Buffer.from(`${cred.wpUsername}:${cred.wpPassword}`).toString("base64");
    const apiUrl = `${site.apiUrl}/wp/v2/users/me`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Basic ${auth}` }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch WP user" });
    }

    const wpUser = await response.json();
    res.json({
      displayName: wpUser.name || wpUser.display_name || "Content Creator",
      profilePicture: wpUser.avatar_urls?.[96] || null
    });
  } catch (error: any) {
    console.error("WP user fetch error:", error);
    res.status(500).json({ error: "Failed to fetch WP user profile" });
  }
};
