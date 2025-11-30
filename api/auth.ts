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
        
        // For now, return userId as sessionId (session table support will be added)
        res.json({ id: user.id, email: user.email, role: user.role, sessionId: user.id });
      } else if (action === "logout") {
        res.json({ success: true });
      } 
      else if (action === "authenticate") {
        const { userId, siteId, wpUsername, wpPassword } = req.body;
        if (!userId || !siteId || !wpUsername || !wpPassword) {
          return res.status(400).json({ error: "All fields required" });
        }

        const { getDb, initializeDb } = await import("./db-utils.js");
        initializeDb();
        const db = getDb();
        const { userSiteCredentials } = await import("../shared/schema.js");
        const { eq, and } = await import("drizzle-orm");

        try {
          // Check if credential exists
          const existing = await getUserSiteCredential(userId, siteId);
          
          if (existing) {
            // Delete old and create new (upsert pattern)
            await db.delete(userSiteCredentials).where(eq(userSiteCredentials.id, existing.id));
          }
          
          // Create new credential
          const [credential] = await db.insert(userSiteCredentials).values({
            userId,
            siteId,
            wpUsername,
            wpPassword,
            isVerified: true
          }).returning();

          res.json({ success: true, message: "Credentials saved", credential });
        } catch (error: any) {
          console.error("[Auth] Authenticate error:", error.message);
          res.status(500).json({ error: "Failed to save credentials", details: error.message });
        }
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
