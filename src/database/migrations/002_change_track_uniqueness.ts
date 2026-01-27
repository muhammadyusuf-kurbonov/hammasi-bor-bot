import { sql } from 'drizzle-orm';

export async function changeTrackUniquenessConstraint(db: any) {
  console.log('Changing track uniqueness constraint...');
  
  // First, drop the old unique constraint on track_number
  await db.execute(sql`
    ALTER TABLE shipments 
    DROP CONSTRAINT IF EXISTS shipments_track_number_unique
  `);
  
  // Add the new composite unique constraint on track_number and owner_id
  await db.execute(sql`
    ALTER TABLE shipments 
    ADD CONSTRAINT shipments_track_number_owner_id_unique 
    UNIQUE (track_number, owner_id)
  `);
  
  console.log('Track uniqueness constraint changed successfully!');
}

export async function revertTrackUniquenessConstraint(db: any) {
  console.log('Reverting track uniqueness constraint...');
  
  // Drop the composite unique constraint
  await db.execute(sql`
    ALTER TABLE shipments 
    DROP CONSTRAINT IF EXISTS shipments_track_number_owner_id_unique
  `);
  
  // Add back the original unique constraint on track_number
  await db.execute(sql`
    ALTER TABLE shipments 
    ADD CONSTRAINT shipments_track_number_unique 
    UNIQUE (track_number)
  `);
  
  console.log('Track uniqueness constraint reverted successfully!');
}