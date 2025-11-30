import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Dynamic import to avoid connection issues at build time
    const { storage } = await import("../server/storage");
    
    const users = await storage.getAllAppUsers();
    res.json({
      status: "ok",
      database: "connected",
      usersCount: users.length,
      users: users.map(u => ({ id: u.id, username: u.username }))
    });
  } catch (error: any) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};
