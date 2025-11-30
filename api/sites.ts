import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAllWordPressSites, getUserSiteCredentialsByUserId, getUserSiteCredential, deleteUserSiteCredential, getWordPressSiteById } from "./db-utils.js";
import { getDatabase } from "./db-utils.js";
import { wordPressSites } from "../shared/schema.js";
import { eq } from "drizzle-orm";

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
      
      if (action === "update-credentials") {
        const { siteId: sid, adminUsername, adminPassword, apiToken } = req.body;
        
        if (!sid || !adminUsername) {
          return res.status(400).json({ error: "siteId and adminUsername required" });
        }
        
        if (!adminPassword && !apiToken) {
          return res.status(400).json({ error: "Either adminPassword or apiToken required" });
        }
        
        // Get current site to preserve apiToken if not provided
        const site = await getWordPressSiteById(sid as string);
        if (!site) {
          return res.status(404).json({ error: "Site not found" });
        }
        
        const finalApiToken = apiToken || site.apiToken;
        
        try {
          const db = getDatabase();
          await db.update(wordPressSites).set({ 
            adminUsername, 
            adminPassword: adminPassword || site.adminPassword, 
            apiToken: finalApiToken 
          }).where(eq(wordPressSites.id, sid as string));
          
          return res.json({ success: true, message: "Admin credentials updated" });
        } catch (error: any) {
          console.error("[UpdateCreds] Error:", error.message);
          return res.status(500).json({ error: error.message });
        }
      }
      
      // Handle tag creation - from editor.tsx calling /api/sites/{siteId}/tags
      if (!action && siteId) {
        const { userId, tagName } = req.body;
        if (!tagName) return res.status(400).json({ error: "Tag name required" });
        if (!userId) return res.status(400).json({ error: "userId required" });
        
        try {
          const { getWordPressSiteById } = await import("./db-utils.js");
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
          return res.json({ id: newTag.id, name: newTag.name });
        } catch (error: any) {
          console.error("Tag creation error:", error);
          return res.status(500).json({ error: "Failed to create tag" });
        }
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
