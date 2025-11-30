import { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserSiteCredentialsByUserId, getAllWordPressSites } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const credentials = await getUserSiteCredentialsByUserId(userId);
    const allSites = await getAllWordPressSites();
    
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
    console.error("Sites with auth error:", error.message);
    res.status(500).json({ error: "Failed to fetch sites", details: error.message });
  }
};
