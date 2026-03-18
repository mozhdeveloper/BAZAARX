-- Auto-cancel stale, unconfirmed orders.
--
-- Rule:
-- - If an order remains in shipment_status = 'waiting_for_seller'
--   beyond N days, cancel it automatically.
--
-- This reuses public.cancel_order_atomic(...) to keep cancellation writes
-- (orders + order_cancellations + order_status_history) transactional.

-- Helpful index for stale-order scans
create index if not exists idx_orders_waiting_for_seller_created_at
  on public.orders (created_at)
  where shipment_status = 'waiting_for_seller';

create or replace function public.auto_cancel_unconfirmed_orders(
  p_max_age_days integer default 3,
  p_batch_limit integer default 500
)
returns table(cancelled_order_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_max_age_days integer := greatest(coalesce(p_max_age_days, 3), 1);
  v_batch_limit integer := greatest(coalesce(p_batch_limit, 500), 1);
  v_reason text;
begin
  v_reason := format(
    'Order auto-cancelled: seller did not confirm within %s day(s).',
    v_max_age_days
  );

  for v_order_id in
    select o.id
    from public.orders o
    where o.shipment_status = 'waiting_for_seller'
      and coalesce(o.created_at, now()) <= now() - make_interval(days => v_max_age_days)
      and not exists (
        select 1
        from public.order_cancellations c
        where c.order_id = o.id
      )
    order by o.created_at asc
    limit v_batch_limit
  loop
    perform public.cancel_order_atomic(
      v_order_id,
      v_reason,
      null,
      'system'
    );

    cancelled_order_id := v_order_id;
    return next;
  end loop;

  return;
end;
$$;

comment on function public.auto_cancel_unconfirmed_orders(integer, integer)
  is 'Auto-cancels stale orders still waiting_for_seller after threshold days; returns cancelled order ids.';

grant execute on function public.auto_cancel_unconfirmed_orders(integer, integer) to authenticated;
grant execute on function public.auto_cancel_unconfirmed_orders(integer, integer) to service_role;

-- Optional scheduler setup (run once in SQL editor if pg_cron is enabled):
--
-- select cron.schedule(
--   'auto-cancel-unconfirmed-orders',
--   '15 * * * *',
--   $$
--     select count(*)
--     from public.auto_cancel_unconfirmed_orders(3, 500);
--   $$
-- );
