import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAppUserByUsername, getUserSiteCredential, createUserSiteCredential, getDatabase } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (req.method === "GET") {
      // Check session endpoint
      const { action } = req.query;
      if (action === "session") {
        const { sessionId } = req.query;
        if (!sessionId) {
          return res.status(401).json({ error: "No session" });
        }

        try {
          const db = getDatabase();
          const { userSessions, appUsers } = await import("../shared/schema.js");
          const { eq } = await import("drizzle-orm");

          const [session] = await db.select().from(userSessions).where(eq(userSessions.id, sessionId as string));
          
          if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({ error: "Session expired" });
          }

          const [user] = await db.select().from(appUsers).where(eq(appUsers.id, session.userId));
          if (!user) {
            return res.status(401).json({ error: "User not found" });
          }

          res.json({ id: user.id, email: user.email, role: user.role, sessionId });
        } catch (error: any) {
          res.status(500).json({ error: "Failed to check session" });
        }
      }
      return;
    }

    if (req.method === "POST") {
      const { action } = req.query;
      
      if (action === "login") {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });
        
        const user = await getAppUserByUsername(email);
        if (!user || user.password !== password) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
        
        // Create session - expires in 7 days
        const { createUserSession } = await import("./db-utils.js");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const session = await createUserSession(user.id, expiresAt);
        
        res.json({ id: user.id, email: user.email, role: user.role, pin: user.pin, sessionId: session.id });
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
