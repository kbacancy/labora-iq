alter table if exists public.tests
add column if not exists created_at timestamptz not null default now();
