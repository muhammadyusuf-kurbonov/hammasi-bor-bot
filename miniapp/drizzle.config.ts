import type { Config } from 'drizzle-kit';

export default {
  dialect: 'postgresql',
  schema: '../track-bot/src/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hammasi_bor',
  },
} satisfies Config;