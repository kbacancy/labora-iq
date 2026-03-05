create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'receptionist', 'technician')),
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int not null check (age >= 0),
  gender text not null,
  phone text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  test_name text not null unique,
  price numeric(10,2) not null check (price >= 0),
  normal_range text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lab_orders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  total_price numeric(10,2) not null default 0,
  created_by uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.order_tests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.lab_orders(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete restrict,
  unique (order_id, test_id)
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.lab_orders(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete restrict,
  result_value text not null,
  remarks text,
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (order_id, test_id)
);

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.tests enable row level security;
alter table public.lab_orders enable row level security;
alter table public.order_tests enable row level security;
alter table public.results enable row level security;

drop policy if exists "authenticated_read_profiles" on public.profiles;
create policy "authenticated_read_profiles" on public.profiles
for select to authenticated using (true);

drop policy if exists "authenticated_upsert_profiles" on public.profiles;
create policy "authenticated_upsert_profiles" on public.profiles
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_rw_patients" on public.patients;
create policy "authenticated_rw_patients" on public.patients
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_rw_tests" on public.tests;
create policy "authenticated_rw_tests" on public.tests
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_rw_orders" on public.lab_orders;
create policy "authenticated_rw_orders" on public.lab_orders
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_rw_order_tests" on public.order_tests;
create policy "authenticated_rw_order_tests" on public.order_tests
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_rw_results" on public.results;
create policy "authenticated_rw_results" on public.results
for all to authenticated using (true) with check (true);
