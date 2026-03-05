drop policy if exists orders_update_admin_technician on public.lab_orders;

create policy orders_update_admin_technician on public.lab_orders
for update to authenticated
using (
  public.get_my_role() = 'admin'
  or (
    public.get_my_role() = 'technician'
    and (assigned_to = auth.uid() or status = 'pending')
  )
)
with check (
  public.get_my_role() = 'admin'
  or (
    public.get_my_role() = 'technician'
    and status in ('pending', 'in_progress', 'completed')
    and approval_status in ('draft', 'reviewed')
  )
);
