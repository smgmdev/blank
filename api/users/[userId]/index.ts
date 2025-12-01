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
      // Transform displayName to fullName for frontend
      return res.json({
        ...user,
        fullName: user.displayName || user.fullName
      });
    }
    
    if (req.method === "PATCH") {
      const { displayName, email, password, username, fullName, pin } = req.body;
      const updateData: Record<string, any> = {};
      
      if (displayName) updateData.displayName = displayName;
      if (fullName) updateData.displayName = fullName; // Store fullName as displayName
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      if (username) updateData.username = username;
      if (pin !== undefined) updateData.pin = pin; // Allow null to disable PIN
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
      
      const updated = await updateAppUser(userId, updateData);
      // Transform displayName to fullName for frontend
      return res.json({
        ...updated,
        fullName: updated.displayName || updated.fullName
      });
    }
    
    res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
