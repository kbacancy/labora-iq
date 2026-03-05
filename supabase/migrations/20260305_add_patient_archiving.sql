alter table if exists public.patients
add column if not exists is_archived boolean not null default false;

alter table if exists public.patients
add column if not exists archived_at timestamptz;

alter table if exists public.patients
add column if not exists archived_by uuid references auth.users(id);

create index if not exists idx_patients_is_archived on public.patients(is_archived);
