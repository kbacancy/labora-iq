alter table if exists public.tests
add column if not exists category text;

alter table if exists public.tests
add column if not exists units text;

alter table if exists public.tests
add column if not exists reference_range text;

update public.tests
set reference_range = normal_range
where reference_range is null;

create table if not exists public.samples (
  id uuid primary key default gen_random_uuid(),
  sample_code text not null unique,
  patient_name text not null,
  patient_id uuid not null references public.patients(id) on delete restrict,
  test_type text not null,
  technician_id uuid references auth.users(id),
  status text not null default 'collected' check (status in ('collected', 'received', 'in_testing', 'completed', 'reported')),
  order_id uuid references public.lab_orders(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid references public.samples(id) on delete set null,
  order_id uuid references public.lab_orders(id) on delete set null,
  file_url text not null,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  reagent_name text not null unique,
  quantity numeric(12,2) not null default 0,
  reorder_level numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  table_name text not null,
  record_id text,
  timestamp timestamptz not null default now()
);

alter table if exists public.samples enable row level security;
alter table if exists public.reports enable row level security;
alter table if exists public.inventory enable row level security;
alter table if exists public.audit_logs enable row level security;

drop policy if exists samples_select_all_roles on public.samples;
create policy samples_select_all_roles on public.samples
for select to authenticated
using (true);

drop policy if exists samples_insert_admin_receptionist on public.samples;
create policy samples_insert_admin_receptionist on public.samples
for insert to authenticated
with check (public.get_my_role() in ('admin', 'receptionist'));

drop policy if exists samples_update_admin_technician on public.samples;
create policy samples_update_admin_technician on public.samples
for update to authenticated
using (
  public.get_my_role() = 'admin'
  or (
    public.get_my_role() = 'technician'
    and (technician_id = auth.uid() or technician_id is null)
  )
)
with check (
  public.get_my_role() = 'admin'
  or (
    public.get_my_role() = 'technician'
    and (technician_id = auth.uid() or technician_id is null)
  )
);

drop policy if exists reports_select_all_roles on public.reports;
create policy reports_select_all_roles on public.reports
for select to authenticated
using (true);

drop policy if exists reports_insert_admin_technician on public.reports;
create policy reports_insert_admin_technician on public.reports
for insert to authenticated
with check (public.get_my_role() in ('admin', 'technician'));

drop policy if exists inventory_select_all_roles on public.inventory;
create policy inventory_select_all_roles on public.inventory
for select to authenticated
using (true);

drop policy if exists inventory_rw_admin on public.inventory;
create policy inventory_rw_admin on public.inventory
for all to authenticated
using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs
for select to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
create policy audit_logs_insert_authenticated on public.audit_logs
for insert to authenticated
with check (true);

insert into storage.buckets (id, name, public)
values ('lab-reports', 'lab-reports', true)
on conflict (id) do nothing;

drop policy if exists lab_reports_read_authenticated on storage.objects;
create policy lab_reports_read_authenticated on storage.objects
for select to authenticated
using (bucket_id = 'lab-reports');

drop policy if exists lab_reports_insert_authenticated on storage.objects;
create policy lab_reports_insert_authenticated on storage.objects
for insert to authenticated
with check (bucket_id = 'lab-reports');
