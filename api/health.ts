import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../server/storage";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const users = await storage.getAllAppUsers();
    res.json({
      status: "ok",
      database: "connected",
      usersCount: users.length,
      users: users.map(u => ({ id: u.id, username: u.username }))
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error.message
    });
  }
};
