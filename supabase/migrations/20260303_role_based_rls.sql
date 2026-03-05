alter table if exists public.lab_orders
add column if not exists assigned_to uuid references auth.users(id);

alter table if exists public.lab_orders
add column if not exists created_by uuid references auth.users(id);

alter table if exists public.patients
add column if not exists created_by uuid references auth.users(id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'order_tests' and column_name = 'lab_order_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'order_tests' and column_name = 'order_id'
  ) then
    alter table public.order_tests rename column lab_order_id to order_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'results' and column_name = 'lab_order_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'results' and column_name = 'order_id'
  ) then
    alter table public.results rename column lab_order_id to order_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'results' and column_name = 'test_catalog_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'results' and column_name = 'test_id'
  ) then
    alter table public.results rename column test_catalog_id to test_id;
  end if;
end $$;

alter table if exists public.order_tests add column if not exists order_id uuid;
alter table if exists public.order_tests add column if not exists test_id uuid;
alter table if exists public.results add column if not exists order_id uuid;
alter table if exists public.results add column if not exists test_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'order_tests_order_id_fkey'
  ) then
    alter table public.order_tests
      add constraint order_tests_order_id_fkey
      foreign key (order_id) references public.lab_orders(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'order_tests_test_id_fkey'
  ) then
    alter table public.order_tests
      add constraint order_tests_test_id_fkey
      foreign key (test_id) references public.tests(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'results_order_id_fkey'
  ) then
    alter table public.results
      add constraint results_order_id_fkey
      foreign key (order_id) references public.lab_orders(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'results_test_id_fkey'
  ) then
    alter table public.results
      add constraint results_test_id_fkey
      foreign key (test_id) references public.tests(id) on delete restrict;
  end if;
end $$;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1
$$;

grant execute on function public.get_my_role() to authenticated;

drop policy if exists "authenticated_read_profiles" on public.profiles;
drop policy if exists "authenticated_upsert_profiles" on public.profiles;
drop policy if exists "authenticated_rw_patients" on public.patients;
drop policy if exists "authenticated_rw_tests" on public.tests;
drop policy if exists "authenticated_rw_orders" on public.lab_orders;
drop policy if exists "authenticated_rw_order_tests" on public.order_tests;
drop policy if exists "authenticated_rw_results" on public.results;

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists patients_select_all_roles on public.patients;
drop policy if exists patients_insert_admin_receptionist on public.patients;
drop policy if exists patients_update_admin_receptionist on public.patients;
drop policy if exists patients_delete_admin on public.patients;
drop policy if exists tests_select_all_roles on public.tests;
drop policy if exists tests_insert_admin on public.tests;
drop policy if exists tests_update_admin on public.tests;
drop policy if exists tests_delete_admin on public.tests;
drop policy if exists orders_select_by_role on public.lab_orders;
drop policy if exists orders_insert_admin_receptionist on public.lab_orders;
drop policy if exists orders_update_admin_technician on public.lab_orders;
drop policy if exists order_tests_select_by_order_access on public.order_tests;
drop policy if exists order_tests_insert_admin_receptionist on public.order_tests;
drop policy if exists results_select_by_order_access on public.results;
drop policy if exists results_insert_admin_technician on public.results;
drop policy if exists results_update_admin_technician on public.results;
drop policy if exists results_delete_admin_technician on public.results;

create policy profiles_select_self on public.profiles
for select to authenticated
using (id = auth.uid());

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy patients_select_all_roles on public.patients
for select to authenticated
using (true);

create policy patients_insert_admin_receptionist on public.patients
for insert to authenticated
with check (public.get_my_role() in ('admin', 'receptionist'));

create policy patients_update_admin_receptionist on public.patients
for update to authenticated
using (public.get_my_role() in ('admin', 'receptionist'))
with check (public.get_my_role() in ('admin', 'receptionist'));

create policy patients_delete_admin on public.patients
for delete to authenticated
using (public.get_my_role() = 'admin');

create policy tests_select_all_roles on public.tests
for select to authenticated
using (true);

create policy tests_insert_admin on public.tests
for insert to authenticated
with check (public.get_my_role() = 'admin');

create policy tests_update_admin on public.tests
for update to authenticated
using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

create policy tests_delete_admin on public.tests
for delete to authenticated
using (public.get_my_role() = 'admin');

create policy orders_select_by_role on public.lab_orders
for select to authenticated
using (
  public.get_my_role() in ('admin', 'receptionist')
  or (
    public.get_my_role() = 'technician'
    and (assigned_to = auth.uid() or status = 'pending')
  )
);

create policy orders_insert_admin_receptionist on public.lab_orders
for insert to authenticated
with check (public.get_my_role() in ('admin', 'receptionist'));

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
    and status in ('pending', 'completed')
  )
);

create policy order_tests_select_by_order_access on public.order_tests
for select to authenticated
using (
  exists (
    select 1
    from public.order_tests ot
    join public.lab_orders lo on lo.id = ot.order_id
    where ot.id = id
      and (
        public.get_my_role() in ('admin', 'receptionist')
        or (
          public.get_my_role() = 'technician'
          and (lo.assigned_to = auth.uid() or lo.status = 'pending')
        )
      )
  )
);

create policy order_tests_insert_admin_receptionist on public.order_tests
for insert to authenticated
with check (public.get_my_role() in ('admin', 'receptionist'));

create policy results_select_by_order_access on public.results
for select to authenticated
using (
  exists (
    select 1
    from public.results r
    join public.lab_orders lo on lo.id = r.order_id
    where r.id = id
      and (
        public.get_my_role() in ('admin', 'receptionist')
        or (
          public.get_my_role() = 'technician'
          and (lo.assigned_to = auth.uid() or lo.status = 'pending')
        )
      )
  )
);

create policy results_insert_admin_technician on public.results
for insert to authenticated
with check (
  public.get_my_role() = 'admin'
  or (
    public.get_my_role() = 'technician'
    and exists (
      select 1
      from public.lab_orders lo
      where lo.id = order_id
        and (lo.assigned_to = auth.uid() or lo.status = 'pending')
    )
  )
);

create policy results_update_admin_technician on public.results
for update to authenticated
using (
  public.get_my_role() = 'admin'
  or (
    public.get_my_role() = 'technician'
    and exists (
      select 1
      from public.results r
      join public.lab_orders lo on lo.id = r.order_id
      where r.id = id
        and (lo.assigned_to = auth.uid() or lo.status = 'pending')
    )
  )
)
with check (
  public.get_my_role() = 'admin'
  or (
    public.get_my_role() = 'technician'
    and exists (
      select 1
      from public.lab_orders lo
      where lo.id = order_id
        and (lo.assigned_to = auth.uid() or lo.status = 'pending')
    )
  )
);

create policy results_delete_admin_technician on public.results
for delete to authenticated
using (
  public.get_my_role() = 'admin'
  or (
    public.get_my_role() = 'technician'
    and exists (
      select 1
      from public.results r
      join public.lab_orders lo on lo.id = r.order_id
      where r.id = id
        and (lo.assigned_to = auth.uid() or lo.status = 'pending')
    )
  )
);
