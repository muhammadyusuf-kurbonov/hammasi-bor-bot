# AGENTS.md - Development Guide

## Project Overview

E-commerce shipment tracking website with Telegram authentication.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js with Telegram credentials

## Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Environment Variables

Create `.env.local` with:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Key Files

- `src/db/schema.ts` - Database schema (Drizzle)
- `src/app/api/auth/[...nextauth]/route.ts` - Authentication handler
- `src/app/api/shipments/route.ts` - Shipments API
- `src/app/shipments/page.tsx` - Protected shipments page
- `src/app/auth/signin/page.tsx` - Telegram login page

## Telegram Bot Setup

1. Create a bot via @BotFather on Telegram
2. Replace `YOUR_TELEGRAM_BOT_USERNAME` in `src/app/auth/signin/page.tsx`
3. Configure bot settings as needed

## Telegram Mini App Setup

To use as a Telegram Mini App:

1. Set `NEXTAUTH_URL` to your deployed URL (e.g., `https://your-domain.com`)
2. In BotFather, use `/newapp` command to create a Mini App
3. Set the Mini App URL to your deployed domain
4. Users can access the app via the Mini App button in your bot

## Notes

- Shipments are filtered by authenticated user
- API routes are dynamic (use headers for session)
- Use "use client" for components with hooks (useState, useEffect)
- Telegram theme colors are automatically applied when opened as Mini App
