import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const { initializeDb, getAppUserById, updateAppUser } = await import("../../db-utils.js");
    initializeDb();

    if (req.method === "GET") {
      const user = await getAppUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json(user);
    }
    
    if (req.method === "PATCH") {
      const { displayName, profilePicture, email, password } = req.body;
      const updateData: Record<string, any> = {};
      
      if (displayName) updateData.displayName = displayName;
      if (profilePicture) updateData.profilePicture = profilePicture;
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
      
      const updated = await updateAppUser(userId, updateData);
      return res.json(updated);
    }
    
    res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
