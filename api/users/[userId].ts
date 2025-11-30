import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAppUser, initializeDb } from "../db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { userId } = req.query;
    
    if (req.method === "GET") {
      // Get user profile
      initializeDb();
      const { getDb } = await import("../db-utils.js");
      const db = getDb();
      const { appUsers } = await import("../../shared/schema.js");
      const { eq } = await import("drizzle-orm");
      
      const [user] = await db.select().from(appUsers).where(eq(appUsers.id, userId as string));
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } else if (req.method === "PATCH") {
      // Update user profile
      const { displayName, profilePicture, email, password } = req.body;
      
      initializeDb();
      const { getDb } = await import("../db-utils.js");
      const db = getDb();
      const { appUsers } = await import("../../shared/schema.js");
      const { eq } = await import("drizzle-orm");
      
      // Update only provided fields
      const updateData: any = {};
      if (displayName) updateData.displayName = displayName;
      if (profilePicture) updateData.profilePicture = profilePicture;
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
      
      await db.update(appUsers).set(updateData).where(eq(appUsers.id, userId as string));
      
      const [updated] = await db.select().from(appUsers).where(eq(appUsers.id, userId as string));
      res.json(updated);
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("User API error:", error.message);
    res.status(500).json({ error: error.message || "Failed to process request" });
  }
};
