# Journal App

A personal journaling app with daily entries, P/L scoring, tag organization, and integrations with Google Calendar, location history, and health tracking.

## Features

### Core Journaling
- Google OAuth authentication
- Daily entries with morning/afternoon/night sections
- Highlights tracking (highs and lows)
- P and L scores (1-10 scale)
- Weight tracking
- Custom tag system
- Mark entries as complete/incomplete

### Views & Navigation
- Calendar view with color-coded status (complete/incomplete/missing)
- List view with search and filtering
- Date range and tag filtering
- Pagination
- Loading skeletons for fast perceived navigation

### Integrations
- **Google Calendar** - Fetch events, auto-stub into entries
- **Location History** - Import from Google Takeout
- **Oura Ring** - OAuth flow ready, sync endpoint exists

### Data & Export
- CSV export of all entries
- Timeline widget showing daily activity

### Mobile
- iOS app via Capacitor

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components)
- **Database:** Supabase (PostgreSQL with Row-Level Security)
- **Auth:** Supabase Auth (Google OAuth)
- **Styling:** Tailwind CSS 4, Radix UI primitives
- **Icons:** lucide-react
- **Mobile:** Capacitor 8

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `journal-schema.sql` in the SQL Editor
   - Enable Google OAuth in Authentication > Providers (include `calendar.readonly` scope)
   - Copy your project URL and anon key

3. **Configure environment variables:**
   Create `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## iOS Development

Build and sync web changes to the iOS app:

```bash
npm run build && npx cap sync ios
```

Open in Xcode:

```bash
cd ios/App && open App.xcodeproj
```

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

## Roadmap

- Oura data visualization in entries
- Score trends over time
- Tag correlation analysis
- Streak tracking
