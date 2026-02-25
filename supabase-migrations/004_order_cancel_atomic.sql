-- Atomic cancellation RPC for orders.
-- Updates orders + inserts cancellation + inserts status history in one transaction.

create or replace function public.cancel_order_atomic(
  p_order_id uuid,
  p_reason text default null,
  p_cancelled_by uuid default null,
  p_changed_by_role text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_payment_status text;
  v_next_payment_status text;
begin
  select payment_status
  into v_payment_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id using errcode = 'P0002';
  end if;

  if v_payment_status in ('paid', 'partially_refunded') then
    v_next_payment_status := 'refunded';
  else
    v_next_payment_status := 'pending_payment';
  end if;

  update public.orders
  set
    payment_status = v_next_payment_status,
    shipment_status = 'returned',
    updated_at = v_now
  where id = p_order_id;

  insert into public.order_cancellations (
    order_id,
    reason,
    cancelled_at,
    cancelled_by
  )
  values (
    p_order_id,
    nullif(trim(p_reason), ''),
    v_now,
    p_cancelled_by
  );

  insert into public.order_status_history (
    order_id,
    status,
    note,
    changed_by,
    changed_by_role,
    metadata
  )
  values (
    p_order_id,
    'cancelled',
    coalesce(nullif(trim(p_reason), ''), 'Order cancelled'),
    p_cancelled_by,
    p_changed_by_role,
    jsonb_build_object(
      'cancelled_at', v_now,
      'payment_status', v_next_payment_status,
      'shipment_status', 'returned'
    )
  );

  return true;
end;
$$;

comment on function public.cancel_order_atomic(uuid, text, uuid, text)
  is 'Atomically cancels an order by updating orders and writing cancellation/history records.';

grant execute on function public.cancel_order_atomic(uuid, text, uuid, text) to authenticated;
grant execute on function public.cancel_order_atomic(uuid, text, uuid, text) to service_role;
