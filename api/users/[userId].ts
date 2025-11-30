import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Initialize database
    const { initializeDb, getDatabase, getAppUserById, updateAppUser } = await import("../db-utils.js");
    initializeDb();

    if (req.method === "GET") {
      try {
        const user = await getAppUserById(userId);
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        res.json(user);
      } catch (error: any) {
        console.error("Get user error:", error);
        res.status(500).json({ error: "Failed to fetch user" });
      }
    } else if (req.method === "PATCH") {
      try {
        const { displayName, profilePicture, email, password } = req.body;
        
        // Build update data - only include fields that are provided
        const updateData: Record<string, any> = {};
        if (displayName !== undefined && displayName !== null) updateData.displayName = displayName;
        if (profilePicture !== undefined && profilePicture !== null) updateData.profilePicture = profilePicture;
        if (email !== undefined && email !== null) updateData.email = email;
        if (password !== undefined && password !== null) updateData.password = password;
        
        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({ error: "No fields to update" });
        }
        
        const updated = await updateAppUser(userId, updateData);
        res.json(updated);
      } catch (error: any) {
        console.error("Update user error:", error);
        res.status(500).json({ error: error.message || "Failed to update user" });
      }
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("User API error:", error.message);
    res.status(500).json({ error: error.message || "Failed to process request" });
  }
};
