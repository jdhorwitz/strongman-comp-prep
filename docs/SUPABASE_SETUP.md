# Supabase Sync Setup

The app works locally with IndexedDB by default. With Supabase configured, Josh can sign in and save updates, while public visitors can see the latest public tracker data without signing in.

## 1. Create private per-user table

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

## 2. Create public read-only tracker table

Replace `jhorwitz@fastmail.com` if you use a different magic-link email.

```sql
create table if not exists public.app_data_public (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_data_public enable row level security;

create policy "anyone can read Josh tracker"
  on public.app_data_public
  for select
  using (id = 'josh');

create policy "only Josh can insert public tracker"
  on public.app_data_public
  for insert
  with check (id = 'josh' and auth.email() = 'jhorwitz@fastmail.com');

create policy "only Josh can update public tracker"
  on public.app_data_public
  for update
  using (id = 'josh' and auth.email() = 'jhorwitz@fastmail.com')
  with check (id = 'josh' and auth.email() = 'jhorwitz@fastmail.com');
```

## 3. Configure auth

In Supabase Authentication settings:

- Enable email magic links / OTP sign-in.
- Set Site URL to `https://jdhorwitz.github.io/strongman-comp-prep/`.
- Add redirect URLs:
  - `https://jdhorwitz.github.io/strongman-comp-prep/`
  - `https://jdhorwitz.github.io/strongman-comp-prep/**`
  - `http://127.0.0.1:5173/strongman-comp-prep/`
  - `http://127.0.0.1:5173/strongman-comp-prep/**`

## 4. Configure environment

For local dev, create `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

For GitHub Pages, add repository variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Sync behavior

- IndexedDB remains the local cache.
- Signed-out/public visitors load the latest `app_data_public` row for `id = 'josh'`.
- When Josh signs in, changes save to both the private row and public row.
- Public visitors see updated progress after refresh/reopen.
- JSON export remains the safest full backup.
