-- Row Level Security on EVERY table in public. Owner-only access via user_id = auth.uid().
-- Tables without client policies (food_cache, revenuecat_events, rate_limits) are reachable only
-- through the service role used by Edge Functions.

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Full CRUD for the owner.
do $$
declare t text;
begin
  foreach t in array array['goals','meals','meal_items','foods_custom','recipes','recipe_items',
    'favorites','water_logs','weight_logs','body_measurements','streaks','achievements',
    'notification_settings']
  loop
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

-- profiles: keyed by id.
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Read-only for the owner (written by triggers / Edge Functions with the service role).
create policy recent_foods_select_own on public.recent_foods for select to authenticated
  using (user_id = (select auth.uid()));
create policy recent_foods_delete_own on public.recent_foods for delete to authenticated
  using (user_id = (select auth.uid()));
create policy ai_scans_select_own on public.ai_scans for select to authenticated
  using (user_id = (select auth.uid()));
create policy usage_quotas_select_own on public.usage_quotas for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_credits_select_own on public.user_credits for select to authenticated
  using (user_id = (select auth.uid()));
create policy subscriptions_select_own on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy audit_events_select_own on public.audit_events for select to authenticated
  using (user_id = (select auth.uid()));

-- Feedback: users can create and read their own reports.
create policy ai_feedback_insert_own on public.ai_feedback for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy ai_feedback_select_own on public.ai_feedback for select to authenticated
  using (user_id = (select auth.uid()));

-- Public reference data.
create policy foods_regional_read on public.foods_regional for select to anon, authenticated
  using (true);

-- Explicit grants (Supabase grants broadly by default; RLS is the real gate).
grant usage on schema public to anon, authenticated, service_role;
grant select on public.foods_regional to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.foods_regional, public.ai_scans, public.usage_quotas,
  public.user_credits, public.subscriptions, public.audit_events, public.food_cache,
  public.revenuecat_events, public.rate_limits from authenticated;
grant all on all tables in schema public to service_role;
