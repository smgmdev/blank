import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  // Set proper headers for PATCH support
  res.setHeader('Allow', 'GET, PATCH, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract userId from dynamic route parameter
    let userId = req.query.userId as string;
    
    // Fallback: if userId is not in query, try to parse from URL
    if (!userId && req.url) {
      const match = req.url.match(/\/users\/([a-f0-9-]+)/i);
      if (match) userId = match[1];
    }
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Initialize database
    const { initializeDb, getDatabase, getAppUserById, updateAppUser } = await import("../../db-utils.js");
    initializeDb();

    if (req.method === "GET") {
      try {
        const user = await getAppUserById(userId);
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        return res.status(200).json(user);
      } catch (error: any) {
        console.error("Get user error:", error);
        return res.status(500).json({ error: "Failed to fetch user" });
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
        return res.status(200).json(updated);
      } catch (error: any) {
        console.error("Update user error:", error);
        return res.status(500).json({ error: error.message || "Failed to update user" });
      }
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("User API error:", error.message);
    return res.status(500).json({ error: error.message || "Failed to process request" });
  }
};
