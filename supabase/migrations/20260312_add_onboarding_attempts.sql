create table if not exists public.onboarding_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text,
  email_hash text,
  outcome text not null,
  reason text,
  origin text,
  created_at timestamptz not null default now()
);

create index if not exists idx_onboarding_attempts_created_at
on public.onboarding_attempts(created_at desc);

create index if not exists idx_onboarding_attempts_ip_hash_created_at
on public.onboarding_attempts(ip_hash, created_at desc)
where ip_hash is not null;

create index if not exists idx_onboarding_attempts_email_hash_created_at
on public.onboarding_attempts(email_hash, created_at desc)
where email_hash is not null;

alter table public.onboarding_attempts enable row level security;

revoke all on public.onboarding_attempts from anon, authenticated;
