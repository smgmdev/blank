import { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserSiteCredentialsByUserId, getWordPressSiteById } from "../api/db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const { displayName, profilePictureUrl } = req.body;
    
    // Get all user's site credentials
    const credentials = await getUserSiteCredentialsByUserId(userId);
    if (!credentials || credentials.length === 0) {
      return res.status(200).json({ success: true, message: "No WordPress sites connected" });
    }

    const results: any[] = [];
    
    for (const credential of credentials) {
      try {
        const site = await getWordPressSiteById(credential.siteId);
        if (!site) continue;

        const auth = Buffer.from(`${credential.wpUsername}:${credential.wpPassword}`).toString("base64");
        const updateData: any = {};

        if (displayName) {
          updateData.display_name = displayName;
        }

        if (profilePictureUrl) {
          // Store profile picture URL as user meta
          try {
            updateData.meta = {
              profile_picture_url: profilePictureUrl
            };
            console.log('Setting profile picture meta for user:', credential.wpUserId, 'URL length:', profilePictureUrl.length);
          } catch (e) {
            console.error('Failed to set profile picture meta:', e);
          }
        }

        // Update WordPress user profile using PUT method
        console.log(`Updating WP user ${credential.wpUserId || 'me'} with data:`, updateData);
        const updateRes = await fetch(`${site.apiUrl}/wp/v2/users/${credential.wpUserId || 'me'}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        const updateResultData = await updateRes.json();
        console.log(`WP user update response status:`, updateRes.status, 'data:', updateResultData);
        
        results.push({
          siteId: credential.siteId,
          success: updateRes.ok,
          status: updateRes.status,
          response: updateResultData
        });
      } catch (error: any) {
        results.push({
          siteId: credential.siteId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({ success: true, synced: results });
  } catch (error: any) {
    console.error("Profile sync error:", error);
    res.status(500).json({ error: "Failed to sync profile to WordPress" });
  }
};
