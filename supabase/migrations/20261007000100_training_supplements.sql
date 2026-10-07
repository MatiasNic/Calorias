-- Training log and supplement tracking. Same conventions as core_schema: user_id → auth.users
-- ON DELETE CASCADE, client-generated uuid ids, soft deletes (deleted_at) for offline sync,
-- updated_at maintained by trigger, owner-only RLS.
-- Limits mirror packages/shared/src/training.ts (WORKOUT_LIMITS, WORKOUT_INTENSITIES) and
-- packages/shared/src/supplements.ts (SUPPLEMENT_UNITS).

-- ─── workouts ────────────────────────────────────────────────────────────────
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  local_date date not null,
  activity text not null check (char_length(activity) between 1 and 60),
  title text check (char_length(title) <= 80),
  duration_min integer not null check (duration_min between 0 and 600),
  intensity text not null check (intensity in ('light', 'moderate', 'vigorous')),
  kcal integer not null default 0 check (kcal between 0 and 5000),
  kcal_source text not null default 'estimated' check (kcal_source in ('estimated', 'manual')),
  distance_km numeric(6, 2) check (distance_km between 0 and 1000),
  exercises jsonb not null default '[]' check (jsonb_typeof(exercises) = 'array'),
  rpe smallint check (rpe between 1 and 10),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index workouts_user_idx on public.workouts (user_id, local_date);
create index workouts_user_updated_idx on public.workouts (user_id, updated_at);

-- ─── supplements ─────────────────────────────────────────────────────────────
create table public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  preset text check (char_length(preset) <= 40),
  dose_amount numeric(8, 2) not null check (dose_amount > 0),
  dose_unit text not null check (dose_unit in
    ('mg', 'g', 'mcg', 'iu', 'ml', 'capsule', 'tablet', 'scoop', 'drop', 'serving')),
  -- 0 = Sunday … 6 = Saturday; empty = every day.
  days smallint[] not null default '{}' check (days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  -- "HH:MM", at least one.
  times text[] not null check (
    cardinality(times) between 1 and 12
    and array_to_string(times, ',') ~ '^([01]\d|2[0-3]):[0-5]\d(,([01]\d|2[0-3]):[0-5]\d)*$'
  ),
  reminders boolean not null default true,
  stock numeric(8, 2) check (stock >= 0),
  low_stock_threshold numeric(8, 2) check (low_stock_threshold >= 0),
  -- Nutrients of one dose (counted in the diary when count_in_macros).
  nutrition jsonb check (nutrition is null or jsonb_typeof(nutrition) = 'object'),
  count_in_macros boolean not null default false,
  active boolean not null default true,
  start_date date not null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index supplements_user_idx on public.supplements (user_id, updated_at);

-- ─── supplement intakes ──────────────────────────────────────────────────────
create table public.supplement_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  supplement_id uuid not null references public.supplements (id) on delete cascade,
  taken_at timestamptz not null,
  local_date date not null,
  slot text not null check (slot ~ '^([01]\d|2[0-3]):[0-5]\d$' or slot = 'extra'),
  dose_amount numeric(8, 2) not null check (dose_amount > 0),
  -- Diary meal created when the supplement counts in macros. No FK: the meal syncs on its own
  -- and may be soft-deleted independently; both rows disappear together on account deletion.
  meal_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index supplement_intakes_user_idx on public.supplement_intakes (user_id, local_date);
create index supplement_intakes_user_updated_idx on public.supplement_intakes (user_id, updated_at);
create index supplement_intakes_supplement_idx on public.supplement_intakes (supplement_id);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['workouts', 'supplements', 'supplement_intakes']
  loop
    execute format('create trigger set_updated_at before update on public.%I
      for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- RLS: owner-only CRUD (same policies as 20261004000400_rls.sql).
do $$
declare t text;
begin
  foreach t in array array['workouts', 'supplements', 'supplement_intakes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select to authenticated
      using (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert to authenticated
      with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete to authenticated
      using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- An intake must point at a supplement of the same user (RLS alone would allow referencing
-- another user's supplement id if it were known).
create or replace function public.supplement_intake_owner_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.supplements s
    where s.id = new.supplement_id and s.user_id = new.user_id
  ) then
    raise exception 'supplement % does not belong to user', new.supplement_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger supplement_intakes_owner_check
  before insert or update of supplement_id, user_id on public.supplement_intakes
  for each row execute function public.supplement_intake_owner_check();

-- Explicit grants (tables created after 20261004000400_rls.sql are not covered by its grants).
grant select, insert, update, delete on public.workouts, public.supplements,
  public.supplement_intakes to authenticated;
grant all on public.workouts, public.supplements, public.supplement_intakes to service_role;
