# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal journaling app with daily entries, P/L scoring (1-10), tag organization, and Google Calendar integration. Built as a Next.js web app with an iOS wrapper via Capacitor.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

**iOS development:**
```bash
npm run build && npx cap sync ios    # Sync web changes to iOS
cd ios/App && open App.xcodeproj     # Open in Xcode
```

## Architecture

### Tech Stack
- **Framework:** Next.js 15 with App Router and Server Components
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **Auth:** Supabase Auth + Google OAuth (includes calendar.readonly scope)
- **UI:** Tailwind CSS 4, Radix UI primitives, lucide-react icons
- **Mobile:** Capacitor 8 wrapping the web app for iOS

### Key Patterns

**Dual Supabase clients:**
- `src/lib/supabase-server.ts` - Server-side client for Server Components
- `src/lib/supabase.ts` - Client-side browser client

**Auth flow:**
- Middleware (`src/middleware.ts`) redirects unauthenticated users to `/login`
- Google OAuth callback handled at `/auth/callback/route.ts`

**Entry management:**
- Entries use upsert based on unique `user_id + date` constraint
- Tags linked via `entry_tags` junction table (many-to-many)
- Form handles creation, editing, and Google Calendar event fetching

### Critical Files
- `src/components/EntryForm.tsx` - Main form handling most user interaction
- `src/app/entries/page.tsx` - Calendar and list views for entries
- `src/app/api/calendar/route.ts` - Google Calendar v3 integration
- `journal-schema.sql` - Database schema with RLS policies

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json)

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Database Schema

Main tables: `entries`, `tags`, `entry_tags` (junction), `calendar_events`

All tables use RLS policies enforcing user data isolation. P/L scores validated as 1-10 in database.
