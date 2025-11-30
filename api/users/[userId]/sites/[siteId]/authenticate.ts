import { VercelRequest, VercelResponse } from "@vercel/node";
import { getWordPressSiteById, getUserSiteCredential, createUserSiteCredential, updateUserSiteCredentialVerification, createPublishingProfile, upsertUserSiteCredential, getPublishingProfilesByUserId } from "../../../../db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { wpUsername, wpPassword } = req.body;
    const userId = req.query.userId as string;
    const siteId = req.query.siteId as string;

    if (!wpUsername || !wpPassword) {
      return res.status(400).json({ error: "WordPress username and password required" });
    }

    if (!userId || !siteId) {
      return res.status(400).json({ error: "User ID and Site ID required" });
    }

    // Get site
    const site = await getWordPressSiteById(siteId);
    if (!site) {
      return res.status(404).json({ error: "Site not found" });
    }

    // Site must be connected first
    if (!site.isConnected) {
      return res.status(403).json({
        error: "Site not verified",
        hint: "Admin must verify the WordPress site connection first"
      });
    }

    // SECURITY: Validate credentials against WordPress REST API
    console.log(`[WP Auth] Validating ${wpUsername} credentials at ${site.apiUrl}`);
    
    const apiUrl = `${site.apiUrl}/wp/v2/users/me`;
    const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");
    
    const wpResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
    });

    console.log(`[WP Auth] WordPress validation response: ${wpResponse.status}`);

    if (!wpResponse.ok) {
      const errorBody = await wpResponse.text();
      console.log(`[WP Auth] Invalid credentials for ${wpUsername}: ${errorBody}`);
      
      if (wpResponse.status === 401) {
        return res.status(401).json({
          error: "Authentication failed",
          hint: "Admin needs to install a Basic Authentication plugin. Try 'REST API Authentication for WP' by miniOrange or 'Basic Authentication (REST API)' by Alain Schlesser, then activate it and try again."
        });
      }
      
      return res.status(401).json({
        error: "Invalid WordPress credentials",
        hint: "Your WordPress username or password is incorrect"
      });
    }

    const wpUser = await wpResponse.json();
    console.log(`[WP Auth] User ${wpUsername} verified as WP user ID: ${wpUser.id}`);

    // Upsert credentials (create or update if already exists)
    const credential = await upsertUserSiteCredential({
      userId,
      siteId,
      wpUsername,
      wpPassword,
    });

    // Mark as verified with actual WP user ID
    await updateUserSiteCredentialVerification(credential.id, String(wpUser.id));

    // Check if publishing profile already exists
    const existingProfiles = await getPublishingProfilesByUserId(userId);
    let profile = existingProfiles.find((p: any) => p.siteId === siteId);
    
    if (!profile) {
      // Create publishing profile if it doesn't exist
      profile = await createPublishingProfile({
        userId,
        siteId,
        credentialId: credential.id,
      });
    }

    res.json({ 
      success: true, 
      message: "Authenticated successfully. You can now publish to this site.",
      profile 
    });
  } catch (error: any) {
    console.error(`[WP Auth] Auth error:`, error.message, error.stack);
    res.status(500).json({ error: "Failed to authenticate with WordPress", details: error.message });
  }
};
