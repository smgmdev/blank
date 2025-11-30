import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAllWordPressSites, getUserSiteCredentialsByUserId, getUserSiteCredential, deleteUserSiteCredential } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { action, userId, siteId } = req.query;

    if (req.method === "GET") {
      if (action === "user-sites") {
        if (!userId) return res.status(400).json({ error: "userId required" });
        
        const credentials = await getUserSiteCredentialsByUserId(userId as string);
        const allSites = await getAllWordPressSites();
        
        const sitesWithAuth = allSites.map(site => {
          const credential = credentials.find(c => c.siteId === site.id);
          return {
            ...site,
            userIsConnected: credential?.isVerified || false,
            hasCredentials: !!credential
          };
        });
        
        return res.json(sitesWithAuth);
      }
      
      // Default: GET all sites
      const sites = await getAllWordPressSites();
      res.json(sites);
    } 
    else if (req.method === "POST") {
      if (action === "disconnect") {
        const { userId: uid, siteId: sid } = req.body;
        if (!uid || !sid) return res.status(400).json({ error: "userId and siteId required" });
        
        const credential = await getUserSiteCredential(uid, sid);
        if (credential) {
          await deleteUserSiteCredential(credential.id);
        }
        
        return res.json({ success: true, message: "Disconnected from site" });
      }
      
      res.status(400).json({ error: "Invalid action" });
    } 
    else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("Sites error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
