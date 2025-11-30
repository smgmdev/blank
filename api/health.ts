import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAllAppUsers } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const users = await getAllAppUsers();
    res.json({
      status: "ok",
      database: "connected",
      usersCount: users.length,
      users: users.map(u => ({ id: u.id, username: u.username }))
    });
  } catch (error: any) {
    console.error("Health check error:", error.message, error.stack);
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error.message
    });
  }
};
