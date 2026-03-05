do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'lab_orders' and column_name = 'total'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'lab_orders' and column_name = 'total_price'
  ) then
    alter table public.lab_orders rename column total to total_price;
  end if;
end $$;

alter table if exists public.lab_orders
add column if not exists total_price numeric(10,2) not null default 0;
