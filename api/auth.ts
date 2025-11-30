import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAppUserByUsername, getUserSiteCredential, createUserSiteCredential } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (req.method === "POST") {
      const { action } = req.query;
      
      if (action === "login") {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });
        
        const user = await getAppUserByUsername(email);
        if (!user || user.password !== password) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
        res.json({ id: user.id, email: user.email, role: user.role });
      } 
      else if (action === "authenticate") {
        const { userId, siteId, wpUsername, wpPassword } = req.body;
        if (!userId || !siteId || !wpUsername || !wpPassword) {
          return res.status(400).json({ error: "All fields required" });
        }

        let credential = await getUserSiteCredential(userId, siteId);
        
        if (credential) {
          // Update existing
          credential.wpUsername = wpUsername;
          credential.wpPassword = wpPassword;
          credential.isVerified = false;
          await createUserSiteCredential(credential);
        } else {
          // Create new
          await createUserSiteCredential({
            userId,
            siteId,
            wpUsername,
            wpPassword,
            isVerified: false
          });
        }

        res.json({ success: true, message: "Credentials saved" });
      }
      else {
        res.status(400).json({ error: "Invalid action" });
      }
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("Auth error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
