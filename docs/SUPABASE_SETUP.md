# Supabase Sync Setup

The app works locally with IndexedDB by default. To sync across browsers/devices, create a Supabase project and add the public URL/anon key as Vite environment variables.

## 1. Create table

Run this in the Supabase SQL editor:

```sql
create table if not exists public.app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

create policy "users can read own tracker data"
  on public.app_data
  for select
  using (auth.uid() = user_id);

create policy "users can insert own tracker data"
  on public.app_data
  for insert
  with check (auth.uid() = user_id);

create policy "users can update own tracker data"
  on public.app_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## 2. Configure auth

In Supabase Authentication settings:

- Enable email magic links / OTP sign-in.
- Add your GitHub Pages URL to allowed redirect URLs.
- For local development, add `http://127.0.0.1:5173/strongman-comp-prep/`.

## 3. Configure environment

For local dev, create `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

For GitHub Pages, add repository secrets or variables and expose them during build. The app only uses the public anon key; Row Level Security protects each user's row.

## Sync behavior

- IndexedDB remains the local cache.
- When signed in, data is saved to Supabase after changes.
- On sign-in, existing remote data wins if present; otherwise local data seeds the remote row.
- JSON export remains the safest full backup.
