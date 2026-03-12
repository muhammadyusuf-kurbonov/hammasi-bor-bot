# Project Summary

## Overall Goal
Telegram bot for tracking shipments and supply goods ("hammasi-bor" means "everything is there" in Uzbek). Includes a track-bot (Telegram bot) and miniapp (Next.js frontend).

## Key Knowledge
- **Database**: PostgreSQL with Drizzle ORM
- **Telegram Bot**: Grammy framework
- **Frontend**: Next.js with Tailwind CSS
- **Schema is source of truth**: All schema changes must be made in `schema.ts`, then migrations generated via `npm run db:generate`
- **Migration commands**:
  - `npm run db:generate` - generate migration from schema
  - `npm run db:migrate` - apply migrations to database
- **User recording**: Users are created on first interaction via middleware in `src/bot.ts` (not pre-registered)

## Recent Actions
1. **Fixed critical bug**: Telegram ID `6568235686` exceeded PostgreSQL integer max (~2.1B), causing runtime error
2. **Solution implemented**:
   - Changed `telegramId` from `integer` to `bigint` in both schemas
   - track-bot: `src/database/schema.ts`
   - miniapp: `src/db/schema.ts`
3. **Generated migration**: `0003_sticky_exodus.sql` with `ALTER TABLE "users" ALTER COLUMN "telegram_id" SET DATA TYPE bigint;`
4. **Fixed JSON syntax error** in `_journal.json` (trailing comma)
5. **Pushed to main**: Commit `ef0ea65`

## Current Plan
1. [DONE] Fix schema - change telegram_id to bigint
2. [DONE] Generate migration via db:generate
3. [DONE] Push to repository
4. [TODO] Run `npm run db:migrate` on production to apply migration

---

## Summary Metadata
**Update time**: 2026-03-12T17:30:16.868Z 
