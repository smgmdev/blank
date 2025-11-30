import { VercelRequest, VercelResponse } from "@vercel/node";
import { getWordPressSiteById, getUserSiteCredential, createUserSiteCredential, updateUserSiteCredentialVerification, createPublishingProfile } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { wpUsername, wpPassword, userId, siteId } = req.body;

    if (!wpUsername || !wpPassword || !userId || !siteId) {
      return res.status(400).json({ error: "wpUsername, wpPassword, userId, and siteId required" });
    }

    const site = await getWordPressSiteById(siteId);
    if (!site) {
      return res.status(404).json({ error: "Site not found" });
    }

    if (!site.isConnected) {
      return res.status(403).json({
        error: "Site not verified",
        hint: "Admin must verify the WordPress site connection first"
      });
    }

    console.log(`[WP Auth] Validating ${wpUsername} at ${site.apiUrl}`);
    
    const apiUrl = `${site.apiUrl}/wp/v2/users/me`;
    const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");
    
    const wpResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
    });

    if (!wpResponse.ok) {
      const errorBody = await wpResponse.text();
      console.log(`[WP Auth] Failed for ${wpUsername}: ${errorBody}`);
      
      if (wpResponse.status === 401) {
        return res.status(401).json({
          error: "Authentication failed",
          hint: "Admin needs to install a Basic Authentication plugin"
        });
      }
      
      return res.status(401).json({
        error: "Invalid WordPress credentials",
        hint: "Your WordPress username or password is incorrect"
      });
    }

    const wpUser = await wpResponse.json();
    console.log(`[WP Auth] Verified user ${wpUsername} as WP user ID: ${wpUser.id}`);

    const existing = await getUserSiteCredential(userId, siteId);
    if (existing) {
      return res.json({ success: true, message: "Already authenticated to this site" });
    }

    const credential = await createUserSiteCredential({
      userId,
      siteId,
      wpUsername,
      wpPassword,
    });

    await updateUserSiteCredentialVerification(credential.id, String(wpUser.id));

    const profile = await createPublishingProfile({
      userId,
      siteId,
      credentialId: credential.id,
    });

    res.json({ 
      success: true, 
      message: "Authenticated successfully"
    });
  } catch (error: any) {
    console.error(`[WP Auth] Error:`, error.message, error.stack);
    res.status(500).json({ error: "Authentication failed", details: error.message });
  }
};
