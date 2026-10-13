-- Security hardening after the 0.4 audit.

-- ─── Profile input limits (they reach AI prompts) ──────────────────────────────
alter table public.profiles
  add constraint profiles_allergies_limit check (
    cardinality(allergies) <= 30 and char_length(array_to_string(allergies, ',')) <= 1500
  ) not valid,
  add constraint profiles_dietary_preferences_limit check (
    cardinality(dietary_preferences) <= 30
    and char_length(array_to_string(dietary_preferences, ',')) <= 1500
  ) not valid,
  add constraint profiles_timezone_length check (char_length(timezone) <= 64) not valid;

-- The timezone decides the user's quota day: only real IANA names are accepted.
create or replace function public.profiles_timezone_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid timezone %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_timezone_check
  before insert or update of timezone on public.profiles
  for each row execute function public.profiles_timezone_check();

-- ─── Child rows must belong to the same user as their parent ──────────────────
-- (foreign keys bypass RLS, so without this a known meal/recipe id of another user could be used)
create or replace function public.meal_item_owner_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.meals m where m.id = new.meal_id and m.user_id = new.user_id) then
    raise exception 'meal % does not belong to user', new.meal_id using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger meal_items_owner_check
  before insert or update of meal_id, user_id on public.meal_items
  for each row execute function public.meal_item_owner_check();

create or replace function public.recipe_item_owner_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.recipes r where r.id = new.recipe_id and r.user_id = new.user_id
  ) then
    raise exception 'recipe % does not belong to user', new.recipe_id using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger recipe_items_owner_check
  before insert or update of recipe_id, user_id on public.recipe_items
  for each row execute function public.recipe_item_owner_check();

-- ─── Atomic credit and subscription writes (service role only) ─────────────────
create or replace function public.add_bonus_scans(p_user uuid, p_amount integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_credits as c (user_id, bonus_photo_scans)
  values (p_user, greatest(p_amount, 0))
  on conflict (user_id) do update
    set bonus_photo_scans = c.bonus_photo_scans + greatest(p_amount, 0), updated_at = now();
$$;
revoke execute on function public.add_bonus_scans(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_bonus_scans(uuid, integer) to service_role;

-- Applies a subscription event unless a newer one was already applied (out-of-order deliveries),
-- in a single statement so two concurrent webhooks can't interleave.
create or replace function public.apply_subscription_event(p jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.subscriptions as s (
    user_id, entitlement, product_id, platform, status, expires_at, is_trial, will_renew,
    original_transaction_id, environment, last_event_type, last_event_at, updated_by_webhook_at
  )
  select r.user_id, 'premium', r.product_id, r.platform, r.status, r.expires_at, r.is_trial,
    r.will_renew, r.original_transaction_id, r.environment, r.last_event_type, r.last_event_at, now()
  from jsonb_populate_record(null::public.subscriptions, p) r
  on conflict (user_id) do update set
    product_id = excluded.product_id,
    platform = excluded.platform,
    status = excluded.status,
    expires_at = excluded.expires_at,
    is_trial = excluded.is_trial,
    will_renew = excluded.will_renew,
    original_transaction_id = excluded.original_transaction_id,
    environment = excluded.environment,
    last_event_type = excluded.last_event_type,
    last_event_at = excluded.last_event_at,
    updated_by_webhook_at = now()
  where s.last_event_at is null or s.last_event_at <= excluded.last_event_at;
$$;
revoke execute on function public.apply_subscription_event(jsonb) from public, anon, authenticated;
grant execute on function public.apply_subscription_event(jsonb) to service_role;

-- ─── Account deletion: billing webhooks keep no personal payload ───────────────
create index if not exists revenuecat_events_app_user_idx on public.revenuecat_events (app_user_id);
