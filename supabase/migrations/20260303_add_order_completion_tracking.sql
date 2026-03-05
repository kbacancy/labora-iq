alter table if exists public.lab_orders
add column if not exists completed_at timestamptz;

alter table if exists public.lab_orders
add column if not exists completed_by uuid references auth.users(id);

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.lab_orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.lab_orders drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.lab_orders
add constraint lab_orders_status_check
check (status in ('pending', 'in_progress', 'completed'));
