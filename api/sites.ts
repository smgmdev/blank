import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAllWordPressSites } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sites = await getAllWordPressSites();
    res.json(sites);
  } catch (error: any) {
    console.error("Sites error:", error.message, error.stack);
    res.status(500).json({ error: "Failed to fetch sites", details: error.message });
  }
};
