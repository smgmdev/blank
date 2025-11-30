import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (req.method === "GET") {
      const { initializeDb } = await import("../../shared/db-client.js");
      const db = initializeDb();
      const { appUsers } = await import("../../shared/schema.js");
      const { eq } = await import("drizzle-orm");
      
      const [user] = await db.select().from(appUsers).where(eq(appUsers.id, userId as string));
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } else if (req.method === "PATCH") {
      const { displayName, profilePicture, email, password } = req.body;
      
      const { initializeDb } = await import("../../shared/db-client.js");
      const db = initializeDb();
      const { appUsers } = await import("../../shared/schema.js");
      const { eq } = await import("drizzle-orm");
      
      // Build update data - only include fields that are provided
      const updateData: Record<string, any> = {};
      if (displayName !== undefined && displayName !== null) updateData.displayName = displayName;
      if (profilePicture !== undefined && profilePicture !== null) updateData.profilePicture = profilePicture;
      if (email !== undefined && email !== null) updateData.email = email;
      if (password !== undefined && password !== null) updateData.password = password;
      
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
