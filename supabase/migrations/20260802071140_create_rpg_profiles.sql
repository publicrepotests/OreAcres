create table if not exists public.rpg_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  progress jsonb not null check (jsonb_typeof(progress) = 'object'),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rpg_profiles enable row level security;

revoke all on table public.rpg_profiles from anon, authenticated;
grant select on table public.rpg_profiles to authenticated;
grant select, insert, update, delete on table public.rpg_profiles to service_role;

drop policy if exists "Players can read their own RPG profile" on public.rpg_profiles;
create policy "Players can read their own RPG profile"
on public.rpg_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists rpg_profiles_updated_at_idx
on public.rpg_profiles (updated_at desc);
