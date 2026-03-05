alter table if exists public.lab_orders
add column if not exists assigned_to uuid references auth.users(id);
