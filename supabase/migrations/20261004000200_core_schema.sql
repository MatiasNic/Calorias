-- Core user data. Every user-owned table has user_id → auth.users ON DELETE CASCADE so that
-- deleting the auth user removes all personal data. Soft deletes (deleted_at) let offline
-- clients sync deletions.

-- ─── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  birth_date date,
  sex text check (sex in ('female', 'male')),
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal_type text check (goal_type in ('lose', 'maintain', 'gain', 'build_muscle', 'eat_healthier')),
  weekly_rate_kg numeric(4, 2) check (weekly_rate_kg between 0 and 1.5),
  target_weight_kg numeric(5, 1) check (target_weight_kg between 30 and 350),
  dietary_preferences text[] not null default '{}',
  allergies text[] not null default '{}',
  timezone text not null default 'America/Argentina/Buenos_Aires',
  locale text not null default 'es-AR' check (locale in ('es-AR', 'en-US', 'pt-BR')),
  country char(2) default 'AR',
  onboarding_completed boolean not null default false,
  save_photos boolean not null default true,
  analytics_consent boolean not null default false,
  terms_accepted_at timestamptz,
  terms_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── goals (history of targets) ──────────────────────────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kcal integer not null check (kcal between 800 and 6000),
  protein_g numeric(6, 1) not null check (protein_g >= 0),
  carbs_g numeric(6, 1) not null check (carbs_g >= 0),
  fat_g numeric(6, 1) not null check (fat_g >= 0),
  fiber_g numeric(6, 1) check (fiber_g >= 0),
  water_ml integer check (water_ml >= 0),
  mode text not null default 'fixed' check (mode in ('fixed', 'adaptive')),
  effective_from date not null,
  tdee_estimate numeric(6, 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index goals_user_effective_idx on public.goals (user_id, effective_from desc);
create index goals_user_updated_idx on public.goals (user_id, updated_at);

-- ─── meals & items ───────────────────────────────────────────────────────────
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  eaten_at timestamptz not null,
  local_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner', 'other')),
  source text not null check (source in ('photo', 'barcode', 'text', 'voice', 'manual', 'recipe', 'favorite', 'label')),
  photo_path text,
  note text check (char_length(note) <= 500),
  ai_scan_id uuid,
  -- cached totals (recomputed by trigger from meal_items)
  kcal numeric(7, 1) not null default 0,
  protein_g numeric(7, 1) not null default 0,
  carbs_g numeric(7, 1) not null default 0,
  fat_g numeric(7, 1) not null default 0,
  fiber_g numeric(7, 1) not null default 0,
  sugar_g numeric(7, 1) not null default 0,
  sodium_mg numeric(8, 0) not null default 0,
  sat_fat_g numeric(7, 1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index meals_user_date_idx on public.meals (user_id, local_date);
create index meals_user_updated_idx on public.meals (user_id, updated_at);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position smallint not null default 0,
  display_name text not null check (char_length(display_name) between 1 and 120),
  food_id text,
  food_source text not null check (food_source in ('usda', 'off', 'regional', 'ai', 'custom', 'recipe')),
  grams numeric(7, 1) not null check (grams between 0 and 5000),
  serving_unit text,
  serving_qty numeric(6, 2),
  per100g jsonb not null,
  kcal numeric(7, 1) not null default 0,
  protein_g numeric(7, 1) not null default 0,
  carbs_g numeric(7, 1) not null default 0,
  fat_g numeric(7, 1) not null default 0,
  fiber_g numeric(7, 1),
  sugar_g numeric(7, 1),
  sodium_mg numeric(8, 0),
  sat_fat_g numeric(7, 1),
  micros jsonb not null default '{}',
  ai_confidence numeric(3, 2) check (ai_confidence between 0 and 1),
  cooking_method text,
  user_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meal_items_meal_idx on public.meal_items (meal_id);
create index meal_items_user_idx on public.meal_items (user_id);

-- ─── foods ───────────────────────────────────────────────────────────────────
create table public.foods_regional (
  id text primary key,
  name_es text not null,
  name_en text not null,
  name_pt text not null,
  aliases text[] not null default '{}',
  category text not null,
  kcal numeric(6, 1) not null,
  protein_g numeric(5, 1) not null,
  carbs_g numeric(5, 1) not null,
  fat_g numeric(5, 1) not null,
  fiber_g numeric(5, 1),
  sugar_g numeric(5, 1),
  sodium_mg numeric(7, 0),
  sat_fat_g numeric(5, 1),
  micros jsonb not null default '{}',
  servings jsonb not null default '[]',
  countries text[] not null default '{AR}',
  source text not null,
  created_at timestamptz not null default now()
);
create index foods_regional_name_trgm on public.foods_regional
  using gin (public.f_unaccent(lower(name_es)) extensions.gin_trgm_ops);
create index foods_regional_aliases_idx on public.foods_regional using gin (aliases);

create table public.foods_custom (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  brand text,
  barcode text,
  kcal numeric(6, 1) not null check (kcal >= 0),
  protein_g numeric(5, 1) not null default 0,
  carbs_g numeric(5, 1) not null default 0,
  fat_g numeric(5, 1) not null default 0,
  fiber_g numeric(5, 1),
  sugar_g numeric(5, 1),
  sodium_mg numeric(7, 0),
  sat_fat_g numeric(5, 1),
  micros jsonb not null default '{}',
  servings jsonb not null default '[]',
  origin text not null default 'manual' check (origin in ('manual', 'label', 'off', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index foods_custom_user_idx on public.foods_custom (user_id, updated_at);
create index foods_custom_barcode_idx on public.foods_custom (user_id, barcode) where barcode is not null;

-- Server-side cache of USDA / Open Food Facts responses (service role only).
create table public.food_cache (
  source text not null check (source in ('usda', 'off')),
  cache_key text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (source, cache_key)
);

-- ─── recipes ─────────────────────────────────────────────────────────────────
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  servings numeric(5, 2) not null default 1 check (servings > 0),
  note text,
  items jsonb not null default '[]',
  total_grams numeric(7, 1) not null default 0,
  kcal numeric(7, 1) not null default 0,
  protein_g numeric(7, 1) not null default 0,
  carbs_g numeric(7, 1) not null default 0,
  fat_g numeric(7, 1) not null default 0,
  fiber_g numeric(7, 1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index recipes_user_idx on public.recipes (user_id, updated_at);

-- Normalized view of recipe ingredients (kept in sync from recipes.items by trigger).
create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position smallint not null default 0,
  display_name text not null,
  food_id text,
  food_source text not null,
  grams numeric(7, 1) not null,
  per100g jsonb not null
);
create index recipe_items_recipe_idx on public.recipe_items (recipe_id);

-- ─── favorites & recents ─────────────────────────────────────────────────────
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('food', 'meal')),
  label text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index favorites_user_idx on public.favorites (user_id, updated_at);

create table public.recent_foods (
  user_id uuid not null references auth.users (id) on delete cascade,
  food_key text not null,
  display_name text not null,
  food_source text not null,
  food_id text,
  per100g jsonb not null,
  last_grams numeric(7, 1) not null,
  use_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  primary key (user_id, food_key)
);
create index recent_foods_user_idx on public.recent_foods (user_id, last_used_at desc);

-- ─── body tracking ───────────────────────────────────────────────────────────
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null,
  local_date date not null,
  ml integer not null check (ml between -2000 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index water_logs_user_idx on public.water_logs (user_id, local_date);
create index water_logs_user_updated_idx on public.water_logs (user_id, updated_at);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null,
  local_date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg between 20 and 400),
  source text not null default 'manual' check (source in ('manual', 'health')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index weight_logs_user_idx on public.weight_logs (user_id, local_date);
create index weight_logs_user_updated_idx on public.weight_logs (user_id, updated_at);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_at timestamptz not null,
  local_date date not null,
  waist_cm numeric(5, 1),
  hip_cm numeric(5, 1),
  chest_cm numeric(5, 1),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index body_measurements_user_idx on public.body_measurements (user_id, updated_at);

-- ─── habits ──────────────────────────────────────────────────────────────────
create table public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_logged_date date,
  updated_at timestamptz not null default now()
);

create table public.achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  meal_reminders jsonb not null default '{"breakfast":{"enabled":true,"time":"08:30"},"lunch":{"enabled":true,"time":"13:00"},"snack":{"enabled":false,"time":"17:30"},"dinner":{"enabled":true,"time":"21:00"}}',
  water_reminder jsonb not null default '{"enabled":false,"everyHours":2,"from":"09:00","to":"21:00"}',
  weigh_in_reminder jsonb not null default '{"enabled":false,"weekday":1,"time":"08:00"}',
  smart_reminders boolean not null default true,
  weekly_summary boolean not null default true,
  updated_at timestamptz not null default now()
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','goals','meals','meal_items','foods_custom','recipes',
    'favorites','water_logs','weight_logs','body_measurements','streaks','notification_settings']
  loop
    execute format('create trigger set_updated_at before update on public.%I
      for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
