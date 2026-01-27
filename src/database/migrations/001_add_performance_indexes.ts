import { sql } from 'drizzle-orm';

export async function addPerformanceIndexes(db: any) {
  console.log('Adding performance indexes...');
  
  // Add composite index for user+track searches (most critical for security)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_shipments_owner_track 
    ON shipments (owner_id, track_number)
  `);
  
  // Add index for user shipments listing (performance optimization)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_shipments_owner_created 
    ON shipments (owner_id, created_at DESC)
  `);
  
  // Add index for status history (performance optimization)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_status_history_shipment 
    ON status_history (shipment_id)
  `);
  
  // Add index for user lookups (performance optimization)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_users_telegram 
    ON users (telegram_id)
  `);
  
  console.log('Performance indexes added successfully!');
}

export async function removePerformanceIndexes(db: any) {
  console.log('Removing performance indexes...');
  
  await db.execute(sql`DROP INDEX IF EXISTS idx_shipments_owner_track`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_shipments_owner_created`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_status_history_shipment`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_users_telegram`);
  
  console.log('Performance indexes removed successfully!');
}