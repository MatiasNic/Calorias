-- RevenueCat TRANSFER: the purchase now belongs to another account.
create or replace function public.transfer_subscription(p_from uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_from = p_to then
    return;
  end if;
  insert into public.subscriptions (
    user_id, entitlement, product_id, platform, status, expires_at, is_trial, will_renew,
    original_transaction_id, environment, last_event_type, last_event_at, updated_by_webhook_at
  )
  select p_to, s.entitlement, s.product_id, s.platform, s.status, s.expires_at, s.is_trial,
    s.will_renew, s.original_transaction_id, s.environment, 'TRANSFER', now(), now()
  from public.subscriptions s
  where s.user_id = p_from
  on conflict (user_id) do update set
    entitlement = excluded.entitlement,
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
    updated_by_webhook_at = excluded.updated_by_webhook_at;
  update public.subscriptions
    set status = 'expired', will_renew = false, last_event_type = 'TRANSFER',
      last_event_at = now(), updated_by_webhook_at = now()
    where user_id = p_from;
end;
$$;
revoke execute on function public.transfer_subscription(uuid, uuid) from public, anon, authenticated;
grant execute on function public.transfer_subscription(uuid, uuid) to service_role;

-- The timezone decides the quota day. Switching it back and forth would grant extra days of
-- quota, so it can change once every 24 hours (the first change, e.g. after sign-up, is free).
-- A change within the window keeps the previous value instead of failing the whole sync.
alter table public.profiles add column if not exists timezone_changed_at timestamptz;

create or replace function public.profiles_timezone_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.timezone is distinct from old.timezone then
    if old.timezone_changed_at is not null
      and old.timezone_changed_at > now() - interval '24 hours' then
      new.timezone := old.timezone;
    else
      new.timezone_changed_at := now();
    end if;
  end if;
  return new;
end;
$$;

-- Runs before profiles_timezone_check (triggers fire in name order) so a kept value is checked too.
create trigger profiles_a_timezone_rate_limit
  before update of timezone on public.profiles
  for each row execute function public.profiles_timezone_rate_limit();
