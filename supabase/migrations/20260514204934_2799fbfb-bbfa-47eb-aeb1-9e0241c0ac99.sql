create or replace function public.get_stock_counts()
returns table(product_id uuid, available bigint)
language sql
stable
security definer
set search_path = public
as $$
  select product_id, count(*)::bigint
  from public.product_stock
  where delivered = false
  group by product_id
$$;

revoke all on function public.get_stock_counts() from public;
grant execute on function public.get_stock_counts() to anon, authenticated;