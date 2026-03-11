create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'receptionist', 'technician')),
  full_name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

alter table if exists public.profiles add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.patients add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.tests add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.lab_orders add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.order_tests add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.results add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.samples add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.reports add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.inventory add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.audit_logs add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.notifications add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.lab_settings add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.compliance_policies add column if not exists org_id uuid references public.organizations(id) on delete cascade;

do $$
declare
  v_org_id uuid;
  v_first_user uuid;
  v_lab_name text;
begin
  select id into v_org_id from public.organizations order by created_at asc limit 1;

  if v_org_id is null then
    select id into v_first_user from public.profiles order by created_at asc limit 1;
    select coalesce((select lab_name from public.lab_settings order by updated_at desc limit 1), 'Default Laboratory') into v_lab_name;

    insert into public.organizations (name, created_by)
    values (v_lab_name, v_first_user)
    returning id into v_org_id;
  end if;

  update public.profiles set org_id = v_org_id where org_id is null;
  update public.patients set org_id = v_org_id where org_id is null;
  update public.tests set org_id = v_org_id where org_id is null;
  update public.lab_orders set org_id = v_org_id where org_id is null;
  update public.order_tests set org_id = v_org_id where org_id is null;
  update public.results set org_id = v_org_id where org_id is null;
  update public.samples set org_id = v_org_id where org_id is null;
  update public.reports set org_id = v_org_id where org_id is null;
  update public.inventory set org_id = v_org_id where org_id is null;
  update public.audit_logs set org_id = v_org_id where org_id is null;
  update public.notifications set org_id = v_org_id where org_id is null;
  update public.lab_settings set org_id = v_org_id where org_id is null;
  update public.compliance_policies set org_id = v_org_id where org_id is null;
end $$;

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.lab_settings'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%singleton%'
  loop
    execute format('alter table public.lab_settings drop constraint %I', c.conname);
  end loop;
end $$;

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.compliance_policies'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%singleton%'
  loop
    execute format('alter table public.compliance_policies drop constraint %I', c.conname);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lab_settings_org_singleton_unique'
  ) then
    alter table public.lab_settings add constraint lab_settings_org_singleton_unique unique (org_id, singleton);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'compliance_policies_org_singleton_unique'
  ) then
    alter table public.compliance_policies add constraint compliance_policies_org_singleton_unique unique (org_id, singleton);
  end if;
end $$;

alter table public.profiles alter column org_id set not null;
alter table public.patients alter column org_id set not null;
alter table public.tests alter column org_id set not null;
alter table public.lab_orders alter column org_id set not null;
alter table public.order_tests alter column org_id set not null;
alter table public.results alter column org_id set not null;
alter table public.samples alter column org_id set not null;
alter table public.reports alter column org_id set not null;
alter table public.inventory alter column org_id set not null;
alter table public.audit_logs alter column org_id set not null;
alter table public.notifications alter column org_id set not null;
alter table public.lab_settings alter column org_id set not null;
alter table public.compliance_policies alter column org_id set not null;

create index if not exists idx_profiles_org_id on public.profiles(org_id);
create index if not exists idx_patients_org_id on public.patients(org_id);
create index if not exists idx_tests_org_id on public.tests(org_id);
create index if not exists idx_lab_orders_org_id on public.lab_orders(org_id);
create index if not exists idx_order_tests_org_id on public.order_tests(org_id);
create index if not exists idx_results_org_id on public.results(org_id);
create index if not exists idx_samples_org_id on public.samples(org_id);
create index if not exists idx_reports_org_id on public.reports(org_id);
create index if not exists idx_inventory_org_id on public.inventory(org_id);
create index if not exists idx_audit_logs_org_id on public.audit_logs(org_id);
create index if not exists idx_notifications_org_id on public.notifications(org_id);
create index if not exists idx_lab_settings_org_id on public.lab_settings(org_id);
create index if not exists idx_compliance_policies_org_id on public.compliance_policies(org_id);
create index if not exists idx_org_members_org_id on public.organization_members(org_id);
create index if not exists idx_org_members_user_id on public.organization_members(user_id);

insert into public.organization_members (org_id, user_id, role, full_name)
select p.org_id, p.id, p.role, p.full_name
from public.profiles p
where p.org_id is not null
on conflict (org_id, user_id)
do update set role = excluded.role, full_name = excluded.full_name;

create or replace function public.sync_org_member_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.organization_members
    where org_id = old.org_id and user_id = old.id;
    return old;
  end if;

  insert into public.organization_members (org_id, user_id, role, full_name)
  values (new.org_id, new.id, new.role, new.full_name)
  on conflict (org_id, user_id)
  do update set role = excluded.role, full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists trg_sync_org_member_from_profile on public.profiles;
create trigger trg_sync_org_member_from_profile
after insert or update or delete on public.profiles
for each row execute function public.sync_org_member_from_profile();

create or replace function public.get_my_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid() limit 1
$$;

grant execute on function public.get_my_org_id() to authenticated;

alter table public.profiles alter column org_id set default public.get_my_org_id();
alter table public.patients alter column org_id set default public.get_my_org_id();
alter table public.tests alter column org_id set default public.get_my_org_id();
alter table public.lab_orders alter column org_id set default public.get_my_org_id();
alter table public.order_tests alter column org_id set default public.get_my_org_id();
alter table public.results alter column org_id set default public.get_my_org_id();
alter table public.samples alter column org_id set default public.get_my_org_id();
alter table public.reports alter column org_id set default public.get_my_org_id();
alter table public.inventory alter column org_id set default public.get_my_org_id();
alter table public.audit_logs alter column org_id set default public.get_my_org_id();
alter table public.notifications alter column org_id set default public.get_my_org_id();
alter table public.lab_settings alter column org_id set default public.get_my_org_id();
alter table public.compliance_policies alter column org_id set default public.get_my_org_id();

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and org_id = public.get_my_org_id() limit 1
$$;

grant execute on function public.get_my_role() to authenticated;

alter table public.organization_members enable row level security;
alter table public.organizations enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'patients', 'tests', 'lab_orders', 'order_tests', 'results',
        'samples', 'reports', 'inventory', 'audit_logs', 'notifications',
        'lab_settings', 'compliance_policies', 'organization_members', 'organizations'
      )
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy organizations_select_member_org on public.organizations
for select to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.org_id = organizations.id
      and om.user_id = auth.uid()
  )
);

create policy organizations_update_admin_org on public.organizations
for update to authenticated
using (id = public.get_my_org_id() and public.get_my_role() = 'admin')
with check (id = public.get_my_org_id() and public.get_my_role() = 'admin');

create policy profiles_select_org on public.profiles
for select to authenticated
using (org_id = public.get_my_org_id());

create policy profiles_update_self_org on public.profiles
for update to authenticated
using (id = auth.uid() and org_id = public.get_my_org_id())
with check (id = auth.uid() and org_id = public.get_my_org_id());

create policy profiles_insert_admin_org on public.profiles
for insert to authenticated
with check (public.get_my_role() = 'admin' and org_id = public.get_my_org_id());

create policy profiles_delete_admin_org on public.profiles
for delete to authenticated
using (public.get_my_role() = 'admin' and org_id = public.get_my_org_id());

create policy org_members_select_org on public.organization_members
for select to authenticated
using (org_id = public.get_my_org_id());

create policy org_members_insert_admin on public.organization_members
for insert to authenticated
with check (public.get_my_role() = 'admin' and org_id = public.get_my_org_id());

create policy org_members_update_admin on public.organization_members
for update to authenticated
using (public.get_my_role() = 'admin' and org_id = public.get_my_org_id())
with check (public.get_my_role() = 'admin' and org_id = public.get_my_org_id());

create policy org_members_delete_admin on public.organization_members
for delete to authenticated
using (public.get_my_role() = 'admin' and org_id = public.get_my_org_id());

create policy patients_select_org on public.patients
for select to authenticated
using (org_id = public.get_my_org_id());

create policy patients_insert_admin_receptionist_org on public.patients
for insert to authenticated
with check (org_id = public.get_my_org_id() and public.get_my_role() in ('admin', 'receptionist'));

create policy patients_update_admin_receptionist_org on public.patients
for update to authenticated
using (org_id = public.get_my_org_id() and public.get_my_role() in ('admin', 'receptionist'))
with check (org_id = public.get_my_org_id() and public.get_my_role() in ('admin', 'receptionist'));

create policy patients_delete_admin_org on public.patients
for delete to authenticated
using (org_id = public.get_my_org_id() and public.get_my_role() = 'admin');

create policy tests_select_org on public.tests
for select to authenticated
using (org_id = public.get_my_org_id());

create policy tests_insert_admin_org on public.tests
for insert to authenticated
with check (org_id = public.get_my_org_id() and public.get_my_role() = 'admin');

create policy tests_update_admin_org on public.tests
for update to authenticated
using (org_id = public.get_my_org_id() and public.get_my_role() = 'admin')
with check (org_id = public.get_my_org_id() and public.get_my_role() = 'admin');

create policy tests_delete_admin_org on public.tests
for delete to authenticated
using (org_id = public.get_my_org_id() and public.get_my_role() = 'admin');

create policy orders_select_org_role on public.lab_orders
for select to authenticated
using (
  org_id = public.get_my_org_id()
  and (
    public.get_my_role() in ('admin', 'receptionist')
    or (
      public.get_my_role() = 'technician'
      and (assigned_to = auth.uid() or status = 'pending')
    )
  )
);

create policy orders_insert_admin_receptionist_org on public.lab_orders
for insert to authenticated
with check (org_id = public.get_my_org_id() and public.get_my_role() in ('admin', 'receptionist'));

create policy orders_update_admin_technician_org on public.lab_orders
for update to authenticated
using (
  org_id = public.get_my_org_id()
  and (
    public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'technician'
      and (assigned_to = auth.uid() or status = 'pending')
    )
  )
)
with check (
  org_id = public.get_my_org_id()
  and (
    public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'technician'
      and status in ('pending', 'in_progress', 'completed')
      and approval_status in ('draft', 'reviewed')
    )
  )
);

create policy order_tests_select_org_role on public.order_tests
for select to authenticated
using (
  org_id = public.get_my_org_id()
  and (
    public.get_my_role() in ('admin', 'receptionist')
    or (
      public.get_my_role() = 'technician'
      and exists (
        select 1
        from public.lab_orders lo
        where lo.id = order_id
          and lo.org_id = public.get_my_org_id()
          and (lo.assigned_to = auth.uid() or lo.status = 'pending')
      )
    )
  )
);

create policy order_tests_insert_admin_receptionist_org on public.order_tests
for insert to authenticated
with check (org_id = public.get_my_org_id() and public.get_my_role() in ('admin', 'receptionist'));

create policy results_select_org_role on public.results
for select to authenticated
using (
  org_id = public.get_my_org_id()
  and (
    public.get_my_role() in ('admin', 'receptionist')
    or (
      public.get_my_role() = 'technician'
      and exists (
        select 1
        from public.lab_orders lo
        where lo.id = order_id
          and lo.org_id = public.get_my_org_id()
          and (lo.assigned_to = auth.uid() or lo.status = 'pending')
      )
    )
  )
);

create policy results_insert_admin_technician_org on public.results
for insert to authenticated
with check (org_id = public.get_my_org_id() and public.get_my_role() in ('admin', 'technician'));

create policy results_update_admin_technician_org on public.results
for update to authenticated
using (
  org_id = public.get_my_org_id()
  and (
    public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'technician'
      and exists (
        select 1
        from public.lab_orders lo
        where lo.id = order_id
          and lo.org_id = public.get_my_org_id()
          and (lo.assigned_to = auth.uid() or lo.status = 'pending')
      )
    )
  )
)
with check (
  org_id = public.get_my_org_id()
  and public.get_my_role() in ('admin', 'technician')
);

create policy results_delete_admin_technician_org on public.results
for delete to authenticated
using (org_id = public.get_my_org_id() and public.get_my_role() in ('admin', 'technician'));

create policy samples_select_org on public.samples
for select to authenticated
using (org_id = public.get_my_org_id());

create policy samples_insert_admin_receptionist_org on public.samples
for insert to authenticated
with check (org_id = public.get_my_org_id() and public.get_my_role() in ('admin', 'receptionist'));

create policy samples_update_admin_technician_org on public.samples
for update to authenticated
using (
  org_id = public.get_my_org_id()
  and (
    public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'technician'
      and (technician_id = auth.uid() or status in ('received', 'in_testing'))
    )
  )
)
with check (
  org_id = public.get_my_org_id()
  and (
    public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'technician'
      and status in ('received', 'in_testing', 'completed', 'reported')
    )
  )
);

create policy reports_select_org on public.reports
for select to authenticated
using (org_id = public.get_my_org_id());

create policy reports_insert_admin_technician_org on public.reports
for insert to authenticated
with check (org_id = public.get_my_org_id() and public.get_my_role() in ('admin', 'technician'));

create policy inventory_select_org on public.inventory
for select to authenticated
using (org_id = public.get_my_org_id());

create policy inventory_write_admin_org on public.inventory
for all to authenticated
using (org_id = public.get_my_org_id() and public.get_my_role() = 'admin')
with check (org_id = public.get_my_org_id() and public.get_my_role() = 'admin');

create policy audit_logs_select_org on public.audit_logs
for select to authenticated
using (org_id = public.get_my_org_id());

create policy audit_logs_insert_org on public.audit_logs
for insert to authenticated
with check (org_id = public.get_my_org_id());

create policy notifications_select_org on public.notifications
for select to authenticated
using (
  org_id = public.get_my_org_id()
  and (
    recipient_user_id = auth.uid()
    or (recipient_role is not null and recipient_role = public.get_my_role())
    or public.get_my_role() = 'admin'
  )
);

create policy notifications_insert_org on public.notifications
for insert to authenticated
with check (org_id = public.get_my_org_id() and public.get_my_role() in ('admin', 'receptionist', 'technician'));

create policy notifications_update_org on public.notifications
for update to authenticated
using (
  org_id = public.get_my_org_id()
  and (
    recipient_user_id = auth.uid()
    or (recipient_role is not null and recipient_role = public.get_my_role())
    or public.get_my_role() = 'admin'
  )
)
with check (
  org_id = public.get_my_org_id()
  and (
    recipient_user_id = auth.uid()
    or (recipient_role is not null and recipient_role = public.get_my_role())
    or public.get_my_role() = 'admin'
  )
);

create policy lab_settings_select_org on public.lab_settings
for select to authenticated
using (org_id = public.get_my_org_id());

create policy lab_settings_write_admin_org on public.lab_settings
for all to authenticated
using (org_id = public.get_my_org_id() and public.get_my_role() = 'admin')
with check (org_id = public.get_my_org_id() and public.get_my_role() = 'admin');

create policy compliance_select_admin_org on public.compliance_policies
for select to authenticated
using (org_id = public.get_my_org_id() and public.get_my_role() = 'admin');

create policy compliance_insert_admin_org on public.compliance_policies
for insert to authenticated
with check (org_id = public.get_my_org_id() and public.get_my_role() = 'admin');

create policy compliance_update_admin_org on public.compliance_policies
for update to authenticated
using (org_id = public.get_my_org_id() and public.get_my_role() = 'admin')
with check (org_id = public.get_my_org_id() and public.get_my_role() = 'admin');
