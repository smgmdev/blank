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
          updateData.name = displayName;
          updateData.display_name = displayName;
        }

        if (profilePictureUrl) {
          // Upload avatar to WordPress media library if it's a data URL
          if (profilePictureUrl.startsWith('data:')) {
            try {
              const base64Data = profilePictureUrl.split(',')[1];
              const uploadRes = await fetch(`${site.apiUrl}/wp/v2/media`, {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${auth}`,
                  'Content-Type': 'image/jpeg',
                  'Content-Disposition': 'attachment; filename="avatar.jpg"'
                },
                body: Buffer.from(base64Data, 'base64')
              });

              if (uploadRes.ok) {
                const media = await uploadRes.json();
                updateData.avatar_urls = { 96: media.source_url };
              }
            } catch (e) {
              console.error('Avatar upload failed:', e);
            }
          }
        }

        // Update WordPress user profile
        const updateRes = await fetch(`${site.apiUrl}/wp/v2/users/${credential.wpUserId || 'me'}`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        results.push({
          siteId: credential.siteId,
          success: updateRes.ok,
          status: updateRes.status
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
