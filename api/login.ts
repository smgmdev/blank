import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAppUserByUsername } from "./db-utils";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await getAppUserByUsername(username);
    
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
    console.error("Login error:", error.message, error.stack);
    res.status(500).json({ 
      error: "Failed to login", 
      details: error.message
    });
  }
};
