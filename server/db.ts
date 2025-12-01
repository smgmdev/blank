import { getDb } from "@shared/db-client";
import { sql } from "drizzle-orm";

// Use shared database client to avoid connection pool exhaustion
export const db = getDb();

// Auto-migrate missing columns on startup
export async function ensureSchemaColumns() {
  try {
    // Check and create imageCaption column if missing
    await db.execute(sql`
      ALTER TABLE articles 
      ADD COLUMN IF NOT EXISTS image_caption TEXT
    `);
    
    // Check and create seo column if missing  
    await db.execute(sql`
      ALTER TABLE articles 
      ADD COLUMN IF NOT EXISTS seo JSONB
    `);
    
    // Check and create admin_password column if missing
    await db.execute(sql`
      ALTER TABLE wordpress_sites 
      ADD COLUMN IF NOT EXISTS admin_password TEXT
    `);
    
    // Check and create displayName column if missing
    await db.execute(sql`
      ALTER TABLE app_users 
      ADD COLUMN IF NOT EXISTS display_name TEXT
    `);
    
    // Check and create pin column if missing
    await db.execute(sql`
      ALTER TABLE app_users 
      ADD COLUMN IF NOT EXISTS pin VARCHAR(4)
    `);
    
    console.log("[DB] Schema columns verified");
  } catch (error) {
    console.error("[DB] Failed to ensure schema columns:", error);
  }
}
