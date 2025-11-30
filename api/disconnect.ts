import { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserSiteCredential, deleteUserSiteCredential } from "./db-utils.js";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, siteId } = req.body;

    if (!userId || !siteId) {
      return res.status(400).json({ error: "userId and siteId required" });
    }

    const credential = await getUserSiteCredential(userId, siteId);
    if (credential) {
      await deleteUserSiteCredential(credential.id);
    }

    res.json({ success: true, message: "Disconnected from site" });
  } catch (error: any) {
    console.error("Disconnect error:", error.message);
    res.status(500).json({ error: "Failed to disconnect", details: error.message });
  }
};
