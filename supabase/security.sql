-- ════════════════════════════════════════════════════════════════════════════
-- Currents — Supabase security baseline
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste this whole
-- file → Run. It is safe to run more than once. It runs in one transaction:
-- if any statement fails, nothing is changed.
--
-- WHY: the anon key inside the app is public (anyone can unzip the APK and
-- read it). Supabase lets that key call your database directly over HTTPS, so
-- the ONLY thing stopping a stranger from reading or changing every journal is
-- Row Level Security (RLS). This file:
--   1. creates the tables the app will sync to (if they don't exist yet),
--   2. turns RLS on (and FORCE) so each user can only touch their own rows,
--   3. removes all access for signed-out (anon) callers,
--   4. adds hard limits (mood 1–5, note ≤ 2000 chars, …) the server enforces
--      no matter what a modified app sends,
--   5. creates a PRIVATE storage bucket where each user can only use their
--      own folder,
--   6. turns RLS on for EVERY other table in `public` (deny-by-default).
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Tables ──────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  display_name            text check (char_length(display_name) <= 80),
  compass_quote           text check (char_length(compass_quote) <= 280),
  avatar_path             text check (char_length(avatar_path) <= 512),
  talisman_path           text check (char_length(talisman_path) <= 512),
  notification_preference text not null default 'None'
                          check (notification_preference in ('Morning', 'Evening', 'Custom', 'None')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table if not exists public.logs (
  id          uuid primary key default gen_random_uuid(),
  -- Defaults to the caller; RLS below rejects any other value.
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date_logged timestamptz not null,
  mood_score  smallint not null check (mood_score between 1 and 5),
  color_hex   text not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  note        text check (char_length(note) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Reject absurd dates (e.g. year 9999 or 1900) sent by a tampered client.
  constraint logs_date_sane check (date_logged > '2020-01-01' and date_logged < now() + interval '2 days')
);

create index if not exists logs_user_date_idx on public.logs (user_id, date_logged);

-- ─── 2. Row Level Security ──────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.logs     enable row level security;
alter table public.logs     force row level security;

-- Signed-out callers get nothing. Signed-in users get only what policies allow.
revoke all on public.profiles, public.logs from anon;
revoke all on public.profiles, public.logs from authenticated;
grant select, insert, update          on public.profiles to authenticated;
grant select, insert, update, delete  on public.logs     to authenticated;

drop policy if exists "profiles: owner can read"   on public.profiles;
drop policy if exists "profiles: owner can insert" on public.profiles;
drop policy if exists "profiles: owner can update" on public.profiles;
create policy "profiles: owner can read"   on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles: owner can insert" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "profiles: owner can update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "logs: owner can read"   on public.logs;
drop policy if exists "logs: owner can insert" on public.logs;
drop policy if exists "logs: owner can update" on public.logs;
drop policy if exists "logs: owner can delete" on public.logs;
create policy "logs: owner can read"   on public.logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "logs: owner can insert" on public.logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- WITH CHECK also stops a user from "gifting" a row to someone else's user_id.
create policy "logs: owner can update" on public.logs for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "logs: owner can delete" on public.logs for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ─── 3. Server-controlled columns ───────────────────────────────────────────
-- Clients can't forge created_at / updated_at.

create or replace function public.tg_set_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_timestamps on public.logs;
create trigger set_timestamps before insert or update on public.logs
  for each row execute function public.tg_set_timestamps();
drop trigger if exists set_timestamps on public.profiles;
create trigger set_timestamps before insert or update on public.profiles
  for each row execute function public.tg_set_timestamps();

-- Create an empty profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
-- Not callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 4. Private storage for avatars / talismans ─────────────────────────────
-- Files must live under  <user-id>/...  and only that user can touch them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-media', 'user-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "user-media: owner can read"   on storage.objects;
drop policy if exists "user-media: owner can upload" on storage.objects;
drop policy if exists "user-media: owner can update" on storage.objects;
drop policy if exists "user-media: owner can delete" on storage.objects;
create policy "user-media: owner can read" on storage.objects for select to authenticated
  using (bucket_id = 'user-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "user-media: owner can upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'user-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "user-media: owner can update" on storage.objects for update to authenticated
  using (bucket_id = 'user-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'user-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "user-media: owner can delete" on storage.objects for delete to authenticated
  using (bucket_id = 'user-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── 5. Deny-by-default for every other table in `public` ───────────────────
-- Any table created from the dashboard without RLS is readable/writable by
-- anyone with the anon key. This switches RLS on for all of them; tables with
-- no policies simply become inaccessible through the API until you add some.

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

commit;

-- ─── 6. Audit (read-only) — run after the above; every row here needs a look ─

-- a) Tables in public WITHOUT RLS (should return 0 rows)
select schemaname, tablename from pg_tables
where schemaname = 'public' and not rowsecurity;

-- b) Tables with RLS but NO policies (inaccessible via API — fine if intended)
select t.tablename from pg_tables t
left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public' group by t.tablename having count(p.policyname) = 0;

-- c) Policies that let anon / everyone in (review each one)
select tablename, policyname, roles, cmd, qual from pg_policies
where schemaname in ('public', 'storage') and (roles @> array['anon']::name[] or roles @> array['public']::name[]);

-- d) Public storage buckets (should be none)
select id, public from storage.buckets where public;

-- e) SECURITY DEFINER functions callable via the API (review each one)
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
