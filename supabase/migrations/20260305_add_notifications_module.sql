create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references auth.users(id) on delete cascade,
  recipient_role text check (recipient_role in ('admin', 'receptionist', 'technician')),
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id text,
  is_read boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (recipient_user_id is not null or recipient_role is not null)
);

alter table if exists public.notifications enable row level security;

drop policy if exists notifications_select_by_user_or_role on public.notifications;
create policy notifications_select_by_user_or_role on public.notifications
for select to authenticated
using (
  recipient_user_id = auth.uid()
  or (recipient_role is not null and recipient_role = public.get_my_role())
);

drop policy if exists notifications_insert_authenticated on public.notifications;
create policy notifications_insert_authenticated on public.notifications
for insert to authenticated
with check (true);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
for update to authenticated
using (
  recipient_user_id = auth.uid()
  or (recipient_role is not null and recipient_role = public.get_my_role())
)
with check (
  recipient_user_id = auth.uid()
  or (recipient_role is not null and recipient_role = public.get_my_role())
);
