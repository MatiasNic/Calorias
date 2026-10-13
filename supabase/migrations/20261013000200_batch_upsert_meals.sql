-- Sync uploads several meals in one request (one round trip instead of one per meal).
-- Same rules as upsert_meal (security invoker: RLS and ownership checks apply to each meal);
-- all or nothing, so the app can retry the meals one by one if one of them is rejected.
create or replace function public.upsert_meals(p jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  m jsonb;
  n integer := 0;
begin
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 100 then
    raise exception 'expected an array of at most 100 meals' using errcode = '22023';
  end if;
  for m in select value from jsonb_array_elements(p) loop
    perform public.upsert_meal(m);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.upsert_meals(jsonb) from public, anon;
grant execute on function public.upsert_meals(jsonb) to authenticated;
