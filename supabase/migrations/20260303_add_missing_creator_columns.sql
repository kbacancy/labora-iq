alter table if exists public.patients
add column if not exists created_by uuid references auth.users(id);

alter table if exists public.lab_orders
add column if not exists created_by uuid references auth.users(id);
