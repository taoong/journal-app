# Architecture

Comprehensive technical reference for the journal app. Keep this file updated when making significant changes (new pages, integrations, schema changes, new patterns, major refactors).

---

## Project Overview

Personal journaling app for daily entries with P/L scoring (1-10), tag organization, highlights, and structured time sections (morning/afternoon/night). Built as a Next.js 15 web app wrapped for iOS via Capacitor.

**Integrations:** Google Calendar (event fetching/caching), Google Takeout location history (import), Oura Ring (OAuth + sync endpoint).

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Server Components) | 15.2.8 |
| Runtime | React | 19.2.3 |
| Database | Supabase (PostgreSQL + RLS) | @supabase/supabase-js ^2.93.3 |
| Auth | Supabase Auth + Google OAuth | @supabase/ssr ^0.8.0 |
| Styling | Tailwind CSS 4 | ^4 |
| UI Primitives | Radix UI (Dialog, Label, Popover, Slider) | ^1.x |
| Icons | lucide-react | ^0.563.0 |
| Validation | Zod | ^4.3.6 |
| Date utilities | date-fns | ^4.1.0 |
| Charts | recharts | ^3.7.0 |
| Mobile | Capacitor (iOS) | ^8.0.2 |
| Testing | Vitest + @testing-library/react | ^3.2.4 |
| Language | TypeScript | ^5 |

---

## Directory Structure

```
src/
├── app/                          # Next.js 15 App Router
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── page.tsx                  # Root — redirects to /entries
│   ├── loading.tsx               # Global loading skeleton
│   ├── auth/
│   │   └── callback/route.ts     # Google OAuth code → session exchange
│   ├── entries/
│   │   ├── page.tsx              # Main calendar/list view (Server Component)
│   │   ├── loading.tsx           # Loading skeleton
│   │   ├── new/page.tsx          # Create new entry
│   │   └── [date]/
│   │       ├── page.tsx          # View/edit single entry by date
│   │       ├── loading.tsx       # Loading skeleton
│   │       └── timeline/page.tsx # Daily timeline visualization
│   ├── login/page.tsx            # Google OAuth login
│   ├── settings/
│   │   ├── page.tsx              # User settings (timezone)
│   │   └── loading.tsx           # Loading skeleton
│   └── api/
│       ├── auth/callback/route.ts         # OAuth callback (alternate path)
│       ├── calendar/route.ts              # Google Calendar v3 fetch + cache
│       ├── preferences/route.ts           # User timezone/preferences CRUD
│       ├── entries/
│       │   ├── search/route.ts            # Full-text search with filters
│       │   ├── export/route.ts            # Export as CSV/JSON
│       │   └── analytics/route.ts         # Counts and score analytics
│       ├── location/
│       │   ├── route.ts                   # Location data CRUD
│       │   └── import/route.ts            # Bulk import from Google Takeout
│       └── oura/
│           └── route.ts                   # Oura data fetch
│           /../oauth/oura/
│               ├── route.ts               # Oura OAuth initiation
│               └── callback/route.ts      # Oura OAuth callback
│
├── components/
│   ├── entry-form/               # Entry form (Client Components)
│   │   ├── EntryForm.tsx         # Main form composition
│   │   ├── CalendarIntegration.tsx # Fetch + display Google Calendar events
│   │   ├── TagSelector.tsx       # Multi-select tag UI with inline creation
│   │   ├── ScoreSliders.tsx      # P/L score sliders (1–10)
│   │   ├── OverwriteModal.tsx    # Confirm overwrite modal
│   │   ├── use-entry-form.ts     # Form state hook (state, validation, submit)
│   │   ├── types.ts              # TypeScript interfaces for form
│   │   └── index.ts              # Barrel export
│   ├── ui/                       # Radix-based primitives
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── label.tsx
│   │   ├── slider.tsx
│   │   ├── debounced-input.tsx   # Input with debounce hook
│   │   └── debounced-textarea.tsx
│   ├── EntryForm.tsx             # Re-export wrapper for entry-form/
│   ├── EntryCard.tsx             # Single entry card display
│   ├── EntriesContent.tsx        # Switches between calendar and list views
│   ├── MissingDayCard.tsx        # Card for missing/incomplete days
│   ├── TimelineWidget.tsx        # Recharts timeline visualization
│   ├── TimezoneSelector.tsx      # Timezone dropdown (settings page)
│   ├── NavLink.tsx               # Link with loading state trigger
│   ├── LogoutButton.tsx          # Supabase signOut button
│   ├── LoadingScreen.tsx         # Full-page loading overlay
│   └── LoadingOverlay.tsx        # Inline loading overlay
│
├── contexts/
│   └── LoadingContext.tsx        # External store for page transition loading state
│
├── hooks/
│   ├── use-debounced-value.ts    # Local state + debounced callback to parent
│   └── useDebouncedCallback.ts   # Generic debounced callback hook
│
├── lib/
│   ├── supabase.ts               # Browser Supabase client (singleton)
│   ├── supabase-server.ts        # Server Supabase client (async factory)
│   ├── validation.ts             # Zod schemas + SQL injection escape
│   ├── constants.ts              # App-wide constants
│   ├── utils.ts                  # cn() tailwind utility (clsx + tailwind-merge)
│   ├── parse-bullets.ts          # Bullet-point time extraction/interpolation
│   ├── incomplete-days.ts        # Missing/incomplete day calculation logic
│   └── __tests__/
│       ├── parse-bullets.test.ts
│       └── validation.test.ts
│
├── types/
│   └── entry.ts                  # Entry, EntryWithTags, and related interfaces
│
└── middleware.ts                 # Auth redirect middleware
```

---

## Key Data Models

Defined in `src/types/entry.ts`:

```typescript
interface Entry {
  id: string
  user_id: string
  date: string               // YYYY-MM-DD
  p_score: number | null     // 1–10
  l_score: number | null     // 1–10
  weight: number | null
  highlights_high: string | null
  highlights_low: string | null
  morning: string | null
  afternoon: string | null
  night: string | null
  complete: boolean
  created_at: string
  updated_at: string
}

interface EntryTag {
  tags: { id?: string; name: string }
}

interface EntryWithTags extends Entry {
  entry_tags?: EntryTag[]
}

interface CalendarEntry {
  date: string
  highlights_high: string | null
  highlights_low: string | null
  complete: boolean
}

interface EntryListItem {
  id: string
  date: string
  p_score: number | null
  l_score: number | null
  weight: number | null
  entry_tags?: { tags: { name: string } }[]
}

interface IncompleteDayItem {
  date: string
  type: 'missing' | 'incomplete'
  entry?: Pick<Entry, 'id' | 'date' | 'p_score' | 'l_score' | 'highlights_high' | 'highlights_low'>
}
```

---

## Database Schema

Full schema in `journal-schema.sql`. All tables have Row-Level Security (RLS) enabled — users access only their own data (`auth.uid() = user_id`).

### Tables

**`entries`** — Core journal entries
- PK: `id` (UUID)
- Unique constraint: `(user_id, date)`
- Key fields: `date`, `p_score` (1–10), `l_score` (1–10), `weight`, `highlights_high`, `highlights_low`, `morning`, `afternoon`, `night`, `complete` (boolean)
- Trigger: auto-updates `updated_at`

**`tags`** — User-defined tags
- PK: `id` (UUID)
- Unique constraint: `(user_id, name)`

**`entry_tags`** — Many-to-many junction
- Composite PK: `(entry_id, tag_id)`

**`calendar_events`** — Cached Google Calendar events
- Fields: `user_id`, `date`, `summary`, `start_time`, `end_time`

**`location_data`** — Google Takeout location visits
- Unique constraint: `(user_id, date)`
- `places` stored as JSONB

**`oura_data`** — Oura wearable data per day
- Unique constraint: `(user_id, date)`
- Fields: `sleep_score`, `readiness_score`, `activity_score`, `hrv`, `heart_rate`, plus full JSONB

**`user_preferences`** — User settings
- Unique constraint: `(user_id)`
- Fields: `timezone` (default: `'America/Los_Angeles'`)

**`integrations`** — OAuth tokens for external services
- Unique constraint: `(user_id, provider)`
- Fields: `provider`, `access_token`, `refresh_token`, `expires_at`

---

## Auth & Session Flow

1. User visits any protected route → middleware checks session
2. No session → redirect to `/login`
3. User clicks "Sign in with Google" → Supabase initiates Google OAuth (includes `calendar.readonly` scope)
4. Google redirects to `/auth/callback?code=...`
5. `route.ts` calls `supabase.auth.exchangeCodeForSession(code)`
6. Session stored in cookies; middleware refreshes on every request via `updateSession()`

**Middleware** (`src/middleware.ts`): Intercepts all routes except static assets. Calls `updateSession()` to refresh auth cookies and redirects unauthenticated users to `/login`.

---

## Supabase Dual-Client Pattern

Two separate clients to match Next.js rendering contexts:

| Client | File | Usage |
|--------|------|-------|
| Browser | `src/lib/supabase.ts` | Client Components; exported as `useSupabase()` hook; singleton cached in module scope |
| Server | `src/lib/supabase-server.ts` | Server Components, API routes; async factory `createServerSupabase()`; manages cookies for session persistence |

**Rule:** Never import `supabase.ts` in Server Components or API routes; never import `supabase-server.ts` in Client Components.

---

## Pages & Routes

### Pages

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Server | Redirects to `/entries` |
| `/login` | Server | Google OAuth login |
| `/entries` | Server | Calendar/list view with filters |
| `/entries/new` | Server | New entry form |
| `/entries/[date]` | Server | Edit/view entry by date |
| `/entries/[date]/timeline` | Server | Daily timeline visualization |
| `/settings` | Server | Timezone and preferences |

### API Routes

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/auth/callback` | GET | OAuth code exchange |
| `/api/calendar` | GET | Fetch + cache Google Calendar events |
| `/api/preferences` | GET, POST, PUT | User preferences CRUD |
| `/api/entries/search` | GET | Full-text search with tag/date/score filters |
| `/api/entries/export` | GET | Export entries as CSV/JSON |
| `/api/entries/analytics` | GET | Totals and score analytics |
| `/api/location` | GET, POST | Location data CRUD |
| `/api/location/import` | POST | Bulk import from Google Takeout |
| `/api/oura` | GET | Fetch Oura data |
| `/api/oauth/oura` | GET | Initiate Oura OAuth |
| `/api/oauth/oura/callback` | GET | Oura OAuth callback |

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `entry-form/EntryForm.tsx` | Main journal entry form; handles creation, editing, calendar fetching, tag selection, score sliders |
| `entry-form/use-entry-form.ts` | All form state, validation logic, and submit handlers |
| `entry-form/CalendarIntegration.tsx` | Fetches and displays Google Calendar events; stub-into-entry flow |
| `entry-form/TagSelector.tsx` | Multi-select tag UI with inline tag creation |
| `entry-form/ScoreSliders.tsx` | P/L score sliders with 1–10 validation |
| `EntriesContent.tsx` | Switches between calendar view and list view; handles client-side filter state |
| `EntryCard.tsx` | Compact entry display for list view |
| `MissingDayCard.tsx` | Shows days with missing or incomplete entries |
| `TimelineWidget.tsx` | Recharts-based visualization of a day's bullet-point timeline |
| `NavLink.tsx` | Link component that triggers LoadingContext loading state on navigation |
| `LoadingScreen.tsx` | Full-page loading overlay shown during page transitions |

---

## Key Library Files

| File | Purpose |
|------|---------|
| `lib/constants.ts` | `DEFAULT_TIMEZONE`, `JOURNAL_START_DATE`, `PAGE_SIZE`, `DEFAULT_DEBOUNCE_DELAY` |
| `lib/validation.ts` | Zod schemas for all API inputs; `escapeSearchQuery()` sanitizes Supabase ilike inputs |
| `lib/parse-bullets.ts` | Extracts and interpolates timestamps from bullet text; supports 12/24-hour, ranges, section-based AM/PM inference |
| `lib/incomplete-days.ts` | Calculates missing and incomplete days from `JOURNAL_START_DATE` to today |
| `lib/utils.ts` | `cn()` — combines clsx + tailwind-merge for conditional class names |

---

## State Management

**Server state:** Server Components fetch directly from Supabase at request time. No client-side data fetching libraries.

**Client state:**
- `LoadingContext` — External store (not React state) for page transition loading overlay. `NavLink` calls `setNavigationTarget()` to show `LoadingScreen`.
- `use-entry-form.ts` — Local useState for all form fields; debounced callbacks prevent excessive re-renders.
- Debounce hooks (`use-debounced-value.ts`, `useDebouncedCallback.ts`) — Used in text inputs and textareas throughout the form.

**Pattern:** No global state management library (no Redux, Zustand, etc.). Server Components handle data; Client Components manage local UI state.

---

## Integrations

### Google Calendar
- OAuth scope: `calendar.readonly` (requested at sign-in)
- API route: `GET /api/calendar?date=YYYY-MM-DD`
- Fetches events for a given day; caches results in `calendar_events` table
- Returns 401 with `requiresReauth: true` when token expired
- UI in `CalendarIntegration.tsx` allows one-click stub of events into entry sections

### Location History
- Source: Google Takeout JSON export
- Import via `POST /api/location/import` (bulk upsert to `location_data`)
- Stored as JSONB `places` array per day

### Oura Ring
- OAuth flow: `/api/oauth/oura` → Oura → `/api/oauth/oura/callback`
- Token stored in `integrations` table
- Data sync: `GET /api/oura`
- Stored in `oura_data` table (sleep, readiness, activity scores, HRV)

---

## Mobile (Capacitor / iOS)

The Next.js web app is wrapped as a native iOS app using Capacitor 8.

**Sync workflow:**
```bash
npm run build && npx cap sync ios   # Build web app and sync to native
cd ios/App && open App.xcodeproj    # Open in Xcode for device/TestFlight builds
```

See `IOS_SETUP.md` for full provisioning and signing setup.

---

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anonymous/public key
```

Google OAuth credentials and calendar API access are configured within Supabase (Authentication > Providers > Google), not directly in `.env.local`.

---

## Validation & Security

- **Zod schemas** in `lib/validation.ts` validate all API route inputs at runtime
- **`escapeSearchQuery()`** sanitizes user-provided strings before Supabase `ilike` queries
- **RLS policies** in PostgreSQL enforce data isolation at the database level — no user can read another user's data even with direct API access
- **P/L score constraint** enforced at DB level (`CHECK (p_score BETWEEN 1 AND 10)`)

---

## Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`). All imports use `@/` prefix.

---

## Maintenance

Update this file when making any of the following changes:
- Adding or removing pages or API routes
- Adding new integrations or external services
- Modifying the database schema (new tables, columns, constraints)
- Introducing new architectural patterns or state management approaches
- Major component refactors that change responsibilities
- Adding new environment variables
