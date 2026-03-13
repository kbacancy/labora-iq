alter table public.notifications
add column if not exists action_url text;

comment on column public.notifications.action_url is
'Frontend destination for the next workflow action related to the notification.';
