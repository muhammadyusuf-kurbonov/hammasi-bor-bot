import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hammasi_bor';

const migrationClient = postgres(connectionString, { max: 1 });

async function main() {
  console.log('Running database migrations...');
  
  const db = drizzle(migrationClient, { schema });
  
  await migrate(db, { migrationsFolder: './src/database/migrations' });
  
  console.log('Migrations completed!');
  await migrationClient.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});