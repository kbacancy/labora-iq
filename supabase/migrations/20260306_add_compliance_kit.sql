create table if not exists public.compliance_policies (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  audit_log_retention_days integer not null default 365 check (audit_log_retention_days > 0),
  report_retention_days integer not null default 2555 check (report_retention_days > 0),
  access_review_frequency_days integer not null default 30 check (access_review_frequency_days > 0),
  last_access_review_at timestamptz,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  check (singleton = true)
);

alter table if exists public.compliance_policies enable row level security;

drop policy if exists compliance_policies_select_admin on public.compliance_policies;
create policy compliance_policies_select_admin on public.compliance_policies
for select to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists compliance_policies_insert_admin on public.compliance_policies;
create policy compliance_policies_insert_admin on public.compliance_policies
for insert to authenticated
with check (public.get_my_role() = 'admin');

drop policy if exists compliance_policies_update_admin on public.compliance_policies;
create policy compliance_policies_update_admin on public.compliance_policies
for update to authenticated
using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

insert into public.compliance_policies (singleton)
values (true)
on conflict (singleton) do nothing;
