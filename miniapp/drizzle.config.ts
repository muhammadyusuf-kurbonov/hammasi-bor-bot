import type { Config } from 'drizzle-kit';

export default {
  driver: 'pg',
  schema: '../track-bot/src/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hammasi_bor',
  },
} satisfies Config;