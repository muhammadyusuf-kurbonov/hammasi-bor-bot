import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from '../../node_modules/@types/pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });