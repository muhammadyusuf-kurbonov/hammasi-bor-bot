import type { Config } from 'drizzle-kit';

export default {
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './src/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hammasi_bor',
  },
} satisfies Config;