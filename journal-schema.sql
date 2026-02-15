-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (Supabase auth handles this, but we'll reference it)

-- Entries table
create table entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  highlights_high text,
  highlights_low text,
  morning text,
  afternoon text,
  night text,
  p_score int check (p_score >= 1 and p_score <= 10),
  l_score int check (l_score >= 1 and l_score <= 10),
  weight numeric(5,2),
  complete boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Migration for existing databases:
-- ALTER TABLE entries ADD COLUMN complete BOOLEAN DEFAULT false;

-- Tags table
create table tags (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, name)
);

-- Entry tags junction table
create table entry_tags (
  entry_id uuid references entries(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  primary key (entry_id, tag_id)
);

-- Calendar events table (for future integration)
create table calendar_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  summary text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Location data table (stores place visits from Google Takeout)
-- The 'places' column stores an array of PlaceVisit objects:
-- {
--   name: string,        -- Place name (e.g., "Blue Bottle Coffee")
--   address: string,     -- Full address
--   lat: number,         -- Latitude
--   lng: number,         -- Longitude
--   startTime: string,   -- ISO timestamp when visit started
--   endTime: string,     -- ISO timestamp when visit ended
--   duration: number,    -- Duration in minutes
--   placeId?: string     -- Optional Google Place ID
-- }
create table location_data (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  places jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Oura data table (for future integration)
create table oura_data (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  sleep_score int,
  readiness_score int,
  activity_score int,
  hrv numeric,
  resting_heart_rate int,
  total_sleep_duration numeric,
  deep_sleep_duration numeric,
  rem_sleep_duration numeric,
  light_sleep_duration numeric,
  awake_duration numeric,
  data jsonb, -- store full response
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- User preferences table
create table user_preferences (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  timezone text default 'America/Los_Angeles',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Integrations table (OAuth tokens)
create table integrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, provider)
);

-- Row Level Security (RLS) policies
alter table entries enable row level security;
alter table tags enable row level security;
alter table entry_tags enable row level security;
alter table calendar_events enable row level security;
alter table location_data enable row level security;
alter table oura_data enable row level security;
alter table user_preferences enable row level security;

-- Entries policies
create policy "Users can view their own entries"
  on entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own entries"
  on entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own entries"
  on entries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own entries"
  on entries for delete
  using (auth.uid() = user_id);

-- Tags policies
create policy "Users can view their own tags"
  on tags for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tags"
  on tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tags"
  on tags for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tags"
  on tags for delete
  using (auth.uid() = user_id);

-- Entry tags policies
create policy "Users can view entry tags for their entries"
  on entry_tags for select
  using (exists (
    select 1 from entries
    where entries.id = entry_tags.entry_id
    and entries.user_id = auth.uid()
  ));

create policy "Users can insert entry tags for their entries"
  on entry_tags for insert
  with check (exists (
    select 1 from entries
    where entries.id = entry_tags.entry_id
    and entries.user_id = auth.uid()
  ));

create policy "Users can delete entry tags for their entries"
  on entry_tags for delete
  using (exists (
    select 1 from entries
    where entries.id = entry_tags.entry_id
    and entries.user_id = auth.uid()
  ));

-- Similar policies for other tables
create policy "Users can view their own calendar events"
  on calendar_events for all
  using (auth.uid() = user_id);

create policy "Users can view their own location data"
  on location_data for all
  using (auth.uid() = user_id);

create policy "Users can view their own oura data"
  on oura_data for all
  using (auth.uid() = user_id);

-- Integrations policies
create policy "Users can view their own integrations"
  on integrations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own integrations"
  on integrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own integrations"
  on integrations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own integrations"
  on integrations for delete
  using (auth.uid() = user_id);

-- User preferences policies
create policy "Users can view their own preferences"
  on user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
  on user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on user_preferences for update
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for entries updated_at
create trigger update_entries_updated_at
  before update on entries
  for each row
  execute procedure update_updated_at_column();

-- Trigger for integrations updated_at
create trigger update_integrations_updated_at
  before update on integrations
  for each row
  execute procedure update_updated_at_column();

-- Trigger for user_preferences updated_at
create trigger update_user_preferences_updated_at
  before update on user_preferences
  for each row
  execute procedure update_updated_at_column();
