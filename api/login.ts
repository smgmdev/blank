import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  console.log("=== LOGIN ENDPOINT CALLED ===");
  console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
  console.log("DATABASE_URL length:", process.env.DATABASE_URL?.length);
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;
    console.log("Login attempt for username:", username);
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Dynamic import to avoid connection issues at build time
    console.log("Importing storage...");
    const { storage } = await import("../server/storage");
    console.log("Storage imported successfully");
    
    console.log("Fetching user from database...");
    const user = await storage.getAppUserByUsername(username);
    console.log("User fetch result:", user ? "User found" : "User not found");
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      companyName: user.companyName,
    });
  } catch (error: any) {
    console.error("=== LOGIN ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error:", error);
    
    res.status(500).json({ 
      error: "Failed to login", 
      details: error.message,
      type: error.constructor.name
    });
  }
};
