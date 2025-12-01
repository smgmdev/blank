import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = (req.query.id || req.body?.userId) as string;

  try {
    console.log('[API] [user] Handler called, method:', req.method);
    
    if (!userId) {
      console.error('[API] Missing userId in request');
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`[API] [user] Request for userId: ${userId}`);
    console.log(`[API] [user] Importing db-utils...`);
    const { getAppUserById, updateAppUser } = await import("./db-utils.js");
    console.log(`[API] [user] db-utils imported successfully`);

    if (req.method === "GET") {
      console.log(`[API] [user] GET /api/user?id=${userId}`);
      console.log(`[API] [user] Calling getAppUserById...`);
      const user = await getAppUserById(userId);
      console.log(`[API] [user] getAppUserById completed`);
      if (!user) {
        console.log(`[API] [user] User not found: ${userId}`);
        return res.status(404).json({ error: "User not found" });
      }
      console.log(`[API] [user] User found: ${user.username}`);
      const response = {
        ...user,
        fullName: user.displayName || user.fullName || ""
      };
      console.log(`[API] [user] Returning user data:`, response);
      return res.json(response);
    }
    
    if (req.method === "PATCH") {
      console.log(`[API] [user] PATCH /api/user?id=${userId}`);
      const { displayName, email, password, username, fullName, pin } = req.body;
      console.log(`[API] [user] Update data received:`, { displayName, email, password, username, fullName, pin });
      const updateData: Record<string, any> = {};
      
      if (displayName) updateData.displayName = displayName;
      if (fullName) updateData.displayName = fullName; // Store fullName as displayName
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      if (username) updateData.username = username;
      if (pin !== undefined) updateData.pin = pin; // Allow null to disable PIN
      
      console.log(`[API] [user] Update data to apply:`, updateData);
      
      if (Object.keys(updateData).length === 0) {
        console.log(`[API] [user] No fields to update`);
        return res.status(400).json({ error: "No fields to update" });
      }
      
      try {
        const updated = await updateAppUser(userId, updateData);
        console.log(`[API] [user] Updated user: ${updated.username}`);
        // Transform displayName to fullName for frontend
        return res.json({
          ...updated,
          fullName: updated.displayName || updated.fullName
        });
      } catch (updateError: any) {
        console.error(`[API] [user] Update failed:`, updateError.message);
        throw updateError;
      }
    }
    
    res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error(`[API] [user] Error:`, error.message || error);
    res.status(500).json({ error: error.message });
  }
};
