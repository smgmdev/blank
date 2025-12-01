import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Content-Type', 'application/json');
  console.log('[TEST] /api/test-user called');
  console.log('[TEST] query:', req.query);
  
  try {
    const { getDatabase, getAppUserById } = await import("./db-utils.js");
    console.log('[TEST] getDatabase imported');
    
    const db = getDatabase();
    console.log('[TEST] database connection obtained');
    
    // Test getting a user
    const userId = "61f1f7cd-ea27-45ae-aaa3-46c9888462e8";
    const user = await getAppUserById(userId);
    console.log('[TEST] User found:', user?.username);
    
    res.json({ 
      success: true,
      userId,
      user: user ? { id: user.id, username: user.username, email: user.email } : null
    });
  } catch (error: any) {
    console.error('[TEST] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
