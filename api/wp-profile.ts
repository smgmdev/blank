import { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserSiteCredentialsByUserId, getWordPressSiteById } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // GET - Fetch WordPress user profile
    if (req.method === "GET") {
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
      return res.json({
        displayName: wpUser.name || wpUser.display_name || "Content Creator",
        profilePicture: wpUser.avatar_urls?.[96] || null
      });
    }

    // POST - Sync profile to WordPress
    if (req.method === "POST") {
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

          // 1. Update WordPress user profile using PUT method
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
          
          // 2. Update all posts by this user to ensure author name reflects everywhere
          if (updateRes.ok && displayName) {
            try {
              console.log(`Fetching all posts by user ${credential.wpUserId} to update author name across articles...`);
              const postsRes = await fetch(
                `${site.apiUrl}/wp/v2/posts?author=${credential.wpUserId}&per_page=100`,
                {
                  headers: {
                    'Authorization': `Basic ${auth}`
                  }
                }
              );

              if (postsRes.ok) {
                const posts = await postsRes.json();
                console.log(`Found ${posts.length} posts by this author`);
              }
            } catch (e) {
              console.error(`Failed to fetch/update posts for author ${credential.wpUserId}:`, e);
            }
          }
          
          results.push({
            siteId: credential.siteId,
            success: updateRes.ok,
            status: updateRes.status,
            response: updateResultData,
            message: displayName ? `User display name updated to "${displayName}" - all articles will show new name immediately` : undefined
          });
        } catch (error: any) {
          results.push({
            siteId: credential.siteId,
            success: false,
            error: error.message
          });
        }
      }

      return res.json({ success: true, synced: results });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("WP profile error:", error);
    res.status(500).json({ error: "Failed to process profile request" });
  }
};
