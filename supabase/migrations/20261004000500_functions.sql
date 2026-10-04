-- Triggers and RPCs.

-- ─── New user bootstrap ──────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, locale, timezone)
  values (
    new.id,
    nullif(left(coalesce(meta ->> 'display_name', meta ->> 'full_name', meta ->> 'name', ''), 80), ''),
    case when meta ->> 'locale' in ('es-AR', 'en-US', 'pt-BR') then meta ->> 'locale' else 'es-AR' end,
    coalesce(nullif(meta ->> 'timezone', ''), 'America/Argentina/Buenos_Aires')
  )
  on conflict (id) do nothing;
  insert into public.notification_settings (user_id) values (new.id) on conflict do nothing;
  insert into public.user_credits (user_id) values (new.id) on conflict do nothing;
  insert into public.streaks (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Meal totals cache ───────────────────────────────────────────────────────
create or replace function public.recompute_meal_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.meal_id, old.meal_id);
begin
  update public.meals m set
    kcal = coalesce(s.kcal, 0),
    protein_g = coalesce(s.protein_g, 0),
    carbs_g = coalesce(s.carbs_g, 0),
    fat_g = coalesce(s.fat_g, 0),
    fiber_g = coalesce(s.fiber_g, 0),
    sugar_g = coalesce(s.sugar_g, 0),
    sodium_mg = coalesce(s.sodium_mg, 0),
    sat_fat_g = coalesce(s.sat_fat_g, 0)
  from (
    select sum(kcal) kcal, sum(protein_g) protein_g, sum(carbs_g) carbs_g, sum(fat_g) fat_g,
           sum(fiber_g) fiber_g, sum(sugar_g) sugar_g, sum(sodium_mg) sodium_mg, sum(sat_fat_g) sat_fat_g
    from public.meal_items where meal_id = target
  ) s
  where m.id = target;
  return null;
end;
$$;

create trigger meal_items_totals
  after insert or update or delete on public.meal_items
  for each row execute function public.recompute_meal_totals();

-- ─── Recent foods (maintained server-side) ───────────────────────────────────
create or replace function public.record_recent_food()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.recent_foods as r (user_id, food_key, display_name, food_source, food_id, per100g, last_grams)
  values (
    new.user_id,
    coalesce(new.food_source || ':' || new.food_id, 'name:' || lower(new.display_name)),
    new.display_name, new.food_source, new.food_id, new.per100g, new.grams
  )
  on conflict (user_id, food_key) do update set
    display_name = excluded.display_name,
    per100g = excluded.per100g,
    last_grams = excluded.last_grams,
    use_count = r.use_count + 1,
    last_used_at = now();
  return null;
end;
$$;

create trigger meal_items_recent
  after insert on public.meal_items
  for each row execute function public.record_recent_food();

-- ─── Recipe items mirror recipes.items ───────────────────────────────────────
create or replace function public.sync_recipe_items()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.recipe_items where recipe_id = new.id;
  insert into public.recipe_items (recipe_id, user_id, position, display_name, food_id, food_source, grams, per100g)
  select new.id, new.user_id, (i.ord - 1)::smallint, i.item ->> 'display_name', i.item ->> 'food_id',
         coalesce(i.item ->> 'food_source', 'custom'), (i.item ->> 'grams')::numeric, coalesce(i.item -> 'per100g', '{}')
  from jsonb_array_elements(new.items) with ordinality as i(item, ord);
  return null;
end;
$$;

create trigger recipes_items_sync
  after insert or update of items on public.recipes
  for each row execute function public.sync_recipe_items();

-- ─── Atomic meal upsert (used by the offline sync engine) ────────────────────
create or replace function public.upsert_meal(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_meal_id uuid := (p ->> 'id')::uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.meals as m (id, user_id, eaten_at, local_date, meal_type, source, photo_path, note, ai_scan_id, deleted_at)
  values (
    v_meal_id, uid, (p ->> 'eaten_at')::timestamptz, (p ->> 'local_date')::date, p ->> 'meal_type',
    p ->> 'source', p ->> 'photo_path', p ->> 'note', nullif(p ->> 'ai_scan_id', '')::uuid,
    nullif(p ->> 'deleted_at', '')::timestamptz
  )
  on conflict (id) do update set
    eaten_at = excluded.eaten_at,
    local_date = excluded.local_date,
    meal_type = excluded.meal_type,
    source = excluded.source,
    photo_path = excluded.photo_path,
    note = excluded.note,
    ai_scan_id = excluded.ai_scan_id,
    deleted_at = excluded.deleted_at
  where m.user_id = uid;

  if not found then
    raise exception 'meal belongs to another user' using errcode = '42501';
  end if;

  delete from public.meal_items where meal_items.meal_id = v_meal_id;
  insert into public.meal_items (
    id, meal_id, user_id, position, display_name, food_id, food_source, grams, serving_unit, serving_qty,
    per100g, kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, sat_fat_g, micros,
    ai_confidence, cooking_method, user_edited
  )
  select
    coalesce(nullif(i.item ->> 'id', '')::uuid, gen_random_uuid()), v_meal_id, uid, (i.ord - 1)::smallint,
    i.item ->> 'display_name', i.item ->> 'food_id', i.item ->> 'food_source', (i.item ->> 'grams')::numeric,
    i.item ->> 'serving_unit', nullif(i.item ->> 'serving_qty', '')::numeric,
    coalesce(i.item -> 'per100g', '{}'),
    coalesce((i.item -> 'nutrients' ->> 'kcal')::numeric, 0),
    coalesce((i.item -> 'nutrients' ->> 'protein_g')::numeric, 0),
    coalesce((i.item -> 'nutrients' ->> 'carbs_g')::numeric, 0),
    coalesce((i.item -> 'nutrients' ->> 'fat_g')::numeric, 0),
    (i.item -> 'nutrients' ->> 'fiber_g')::numeric,
    (i.item -> 'nutrients' ->> 'sugar_g')::numeric,
    (i.item -> 'nutrients' ->> 'sodium_mg')::numeric,
    (i.item -> 'nutrients' ->> 'sat_fat_g')::numeric,
    coalesce(i.item -> 'micros', '{}'),
    nullif(i.item ->> 'ai_confidence', '')::numeric,
    i.item ->> 'cooking_method',
    coalesce((i.item ->> 'user_edited')::boolean, false)
  from jsonb_array_elements(coalesce(p -> 'items', '[]')) with ordinality as i(item, ord);

  return v_meal_id;
end;
$$;
grant execute on function public.upsert_meal(jsonb) to authenticated;

-- ─── Plan resolution (server source of truth) ────────────────────────────────
create or replace function public.plan_for(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user
      and s.entitlement = 'premium'
      and s.status in ('active', 'trialing', 'grace_period', 'billing_issue', 'cancelled')
      and (s.expires_at is null or s.expires_at > now())
  ) then 'premium' else 'free' end
$$;
revoke execute on function public.plan_for(uuid) from public, anon, authenticated;
grant execute on function public.plan_for(uuid) to service_role;

create or replace function public.my_plan()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.plan_for(auth.uid())
$$;
grant execute on function public.my_plan() to authenticated;

-- ─── Quotas: atomic check-and-consume ────────────────────────────────────────
-- p_kind: photo_scan | text_query | coach_message. Limits come from packages/shared/plans.ts.
create or replace function public.consume_quota(
  p_user uuid,
  p_kind text,
  p_day date,
  p_daily_limit integer,
  p_trial_limit integer default 0
)
returns table (allowed boolean, used integer, bucket text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  col text := case p_kind
    when 'photo_scan' then 'photo_scans'
    when 'text_query' then 'text_queries'
    when 'coach_message' then 'coach_messages'
  end;
  current_used integer;
  credits public.user_credits%rowtype;
begin
  if col is null then
    raise exception 'unknown quota kind %', p_kind;
  end if;

  insert into public.usage_quotas (user_id, day) values (p_user, p_day) on conflict do nothing;
  insert into public.user_credits (user_id) values (p_user) on conflict do nothing;

  -- Row lock serialises concurrent requests from the same user.
  execute format('select %I from public.usage_quotas where user_id = $1 and day = $2 for update', col)
    into current_used using p_user, p_day;
  select * into credits from public.user_credits c where c.user_id = p_user for update;

  if current_used < p_daily_limit then
    execute format('update public.usage_quotas set %1$I = %1$I + 1 where user_id = $1 and day = $2', col)
      using p_user, p_day;
    bucket := 'daily';
  elsif p_kind = 'coach_message' and credits.lifetime_coach_messages < p_trial_limit then
    execute format('update public.usage_quotas set %1$I = %1$I + 1 where user_id = $1 and day = $2', col)
      using p_user, p_day;
    bucket := 'trial';
  elsif p_kind = 'photo_scan' and credits.bonus_photo_scans > 0 then
    update public.user_credits set bonus_photo_scans = bonus_photo_scans - 1 where user_id = p_user;
    execute format('update public.usage_quotas set %1$I = %1$I + 1 where user_id = $1 and day = $2', col)
      using p_user, p_day;
    bucket := 'bonus';
  else
    allowed := false;
    used := current_used;
    bucket := null;
    return next;
    return;
  end if;

  if p_kind = 'coach_message' then
    update public.user_credits set lifetime_coach_messages = lifetime_coach_messages + 1 where user_id = p_user;
  elsif p_kind = 'photo_scan' then
    update public.user_credits set lifetime_photo_scans = lifetime_photo_scans + 1 where user_id = p_user;
  end if;

  allowed := true;
  used := current_used + 1;
  return next;
end;
$$;
revoke execute on function public.consume_quota(uuid, text, date, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_quota(uuid, text, date, integer, integer) to service_role;

-- Gives back a unit when the AI call failed (users are never charged for errors).
create or replace function public.refund_quota(p_user uuid, p_kind text, p_day date, p_bucket text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  col text := case p_kind
    when 'photo_scan' then 'photo_scans'
    when 'text_query' then 'text_queries'
    when 'coach_message' then 'coach_messages'
  end;
begin
  if col is null then return; end if;
  execute format('update public.usage_quotas set %1$I = greatest(0, %1$I - 1) where user_id = $1 and day = $2', col)
    using p_user, p_day;
  if p_bucket = 'bonus' then
    update public.user_credits set bonus_photo_scans = bonus_photo_scans + 1 where user_id = p_user;
  end if;
  if p_kind = 'coach_message' then
    update public.user_credits set lifetime_coach_messages = greatest(0, lifetime_coach_messages - 1) where user_id = p_user;
  elsif p_kind = 'photo_scan' then
    update public.user_credits set lifetime_photo_scans = greatest(0, lifetime_photo_scans - 1) where user_id = p_user;
  end if;
end;
$$;
revoke execute on function public.refund_quota(uuid, text, date, text) from public, anon, authenticated;
grant execute on function public.refund_quota(uuid, text, date, text) to service_role;

-- ─── AI cost guard ───────────────────────────────────────────────────────────
create or replace function public.ai_cost_today()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(cost_usd), 0) from public.ai_scans where created_at >= date_trunc('day', now())
$$;
revoke execute on function public.ai_cost_today() from public, anon, authenticated;
grant execute on function public.ai_cost_today() to service_role;

-- ─── Rate limiting (fixed window) ────────────────────────────────────────────
create or replace function public.check_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits as r (bucket, window_start, hits) values (p_bucket, w, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning hits into n;
  -- opportunistic cleanup of old windows
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return n <= p_max;
end;
$$;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ─── Regional food search ────────────────────────────────────────────────────
create or replace function public.search_regional_foods(q text, lim integer default 20)
returns setof public.foods_regional
language sql
stable
set search_path = ''
as $$
  select f.* from public.foods_regional f
  where public.f_unaccent(lower(f.name_es)) operator(extensions.%) public.f_unaccent(lower(q))
     or public.f_unaccent(lower(f.name_es)) like '%' || public.f_unaccent(lower(q)) || '%'
     or public.f_unaccent(lower(q)) = any (select public.f_unaccent(lower(a)) from unnest(f.aliases) a)
  order by extensions.similarity(public.f_unaccent(lower(f.name_es)), public.f_unaccent(lower(q))) desc
  limit least(greatest(lim, 1), 50)
$$;
grant execute on function public.search_regional_foods(text, integer) to anon, authenticated;
