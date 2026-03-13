-- Strict RLS hardening for all tenant data tables.
-- This migration is idempotent and safe to re-run.

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'patients',
    'tests',
    'lab_orders',
    'order_tests',
    'results',
    'samples',
    'reports',
    'inventory',
    'audit_logs',
    'notifications',
    'lab_settings',
    'compliance_policies',
    'organizations',
    'organization_members'
  ]
  loop
    execute format('alter table if exists public.%I enable row level security', t);
    execute format('alter table if exists public.%I force row level security', t);
  end loop;
end $$;

-- Prevent unauthenticated access at privilege layer.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'patients',
    'tests',
    'lab_orders',
    'order_tests',
    'results',
    'samples',
    'reports',
    'inventory',
    'audit_logs',
    'notifications',
    'lab_settings',
    'compliance_policies',
    'organizations',
    'organization_members'
  ]
  loop
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from public', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to service_role', t);
  end loop;
end $$;

-- Lock down SECURITY DEFINER helper functions so only intended roles can execute.
revoke all on function public.get_my_org_id() from public;
revoke all on function public.get_my_org_id() from anon;
grant execute on function public.get_my_org_id() to authenticated;
grant execute on function public.get_my_org_id() to service_role;

revoke all on function public.get_my_role() from public;
revoke all on function public.get_my_role() from anon;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.get_my_role() to service_role;
