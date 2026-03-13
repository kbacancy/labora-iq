alter table if exists public.inventory
drop constraint if exists inventory_reagent_name_key;

create unique index if not exists idx_inventory_org_reagent_unique
on public.inventory(org_id, reagent_name);
