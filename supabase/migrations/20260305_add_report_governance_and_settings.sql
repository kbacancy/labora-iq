create table if not exists public.lab_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  lab_name text not null,
  address text,
  phone text,
  email text,
  logo_url text,
  accreditation text,
  report_footer text,
  updated_at timestamptz not null default now()
);

alter table if exists public.lab_settings enable row level security;

alter table if exists public.lab_orders
add column if not exists referring_doctor_name text;

alter table if exists public.lab_orders
add column if not exists approval_status text not null default 'draft';

alter table if exists public.lab_orders
add column if not exists reviewed_by uuid references auth.users(id);

alter table if exists public.lab_orders
add column if not exists reviewed_by_name text;

alter table if exists public.lab_orders
add column if not exists reviewed_at timestamptz;

alter table if exists public.lab_orders
add column if not exists approved_by uuid references auth.users(id);

alter table if exists public.lab_orders
add column if not exists approved_by_name text;

alter table if exists public.lab_orders
add column if not exists approved_at timestamptz;

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.lab_orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%approval_status%'
  loop
    execute format('alter table public.lab_orders drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.lab_orders
add constraint lab_orders_approval_status_check
check (approval_status in ('draft', 'reviewed', 'approved'));

drop policy if exists lab_settings_select_authenticated on public.lab_settings;
create policy lab_settings_select_authenticated on public.lab_settings
for select to authenticated
using (true);

drop policy if exists lab_settings_insert_admin on public.lab_settings;
create policy lab_settings_insert_admin on public.lab_settings
for insert to authenticated
with check (public.get_my_role() = 'admin');

drop policy if exists lab_settings_update_admin on public.lab_settings;
create policy lab_settings_update_admin on public.lab_settings
for update to authenticated
using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

drop policy if exists orders_update_admin_technician on public.lab_orders;
create policy orders_update_admin_technician on public.lab_orders
for update to authenticated
using (
  public.get_my_role() = 'admin'
  or (
    public.get_my_role() = 'technician'
    and (assigned_to = auth.uid() or status = 'pending')
  )
)
with check (
  public.get_my_role() = 'admin'
  or (
    public.get_my_role() = 'technician'
    and status in ('pending', 'in_progress', 'completed')
    and approval_status in ('draft', 'reviewed')
  )
);
