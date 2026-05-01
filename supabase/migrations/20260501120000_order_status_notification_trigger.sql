-- =============================================================================
-- Order Status → Buyer Notification Trigger
--
-- Automatically inserts a row into buyer_notifications whenever an order's
-- shipment_status changes (belt-and-suspenders: JS also fires notifications,
-- but this trigger guarantees delivery even if the edge falls over).
-- =============================================================================

CREATE OR REPLACE FUNCTION public._notify_buyer_on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title   text;
  v_message text;
BEGIN
  -- Only fire when the shipment_status actually changed and a buyer exists
  IF NEW.shipment_status IS NOT DISTINCT FROM OLD.shipment_status THEN
    RETURN NEW;
  END IF;

  IF NEW.buyer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map each status to human-friendly copy
  CASE NEW.shipment_status
    WHEN 'processing' THEN
      v_title   := '✅ Order Confirmed';
      v_message := 'Your order #' || NEW.order_number || ' has been confirmed! Your seller is preparing it.';
    WHEN 'ready_to_ship' THEN
      v_title   := '📦 Ready to Ship';
      v_message := 'Your order #' || NEW.order_number || ' is packed and ready for pickup by the courier.';
    WHEN 'shipped' THEN
      v_title   := '🚚 Order Shipped';
      v_message := 'Your order #' || NEW.order_number || ' is on its way to you!';
    WHEN 'out_for_delivery' THEN
      v_title   := '🏍️ Out for Delivery';
      v_message := 'Your order #' || NEW.order_number || ' is out for delivery. Expect it today!';
    WHEN 'delivered' THEN
      v_title   := '🎉 Order Delivered';
      v_message := 'Your order #' || NEW.order_number || ' has been delivered. Enjoy your purchase!';
    WHEN 'failed_to_deliver' THEN
      v_title   := '⚠️ Delivery Failed';
      v_message := 'Delivery for order #' || NEW.order_number || ' failed. Please check your tracking details.';
    WHEN 'returned' THEN
      v_title   := '↩️ Order Returned';
      v_message := 'Your order #' || NEW.order_number || ' has been returned. A refund will be processed.';
    WHEN 'cancelled' THEN
      v_title   := '❌ Order Cancelled';
      v_message := 'Your order #' || NEW.order_number || ' has been cancelled.';
    ELSE
      -- Ignore unmapped statuses (waiting_for_seller, received, etc.)
      RETURN NEW;
  END CASE;

  -- Insert notification — the existing trg_buyer_notifications_push trigger
  -- will fire automatically to dispatch the push notification via pg_net.
  INSERT INTO public.buyer_notifications (
    buyer_id,
    type,
    title,
    message,
    action_url,
    action_data,
    priority,
    created_at
  ) VALUES (
    NEW.buyer_id,
    'order_' || NEW.shipment_status,
    v_title,
    v_message,
    '/orders/' || NEW.id,
    jsonb_build_object(
      'orderId',      NEW.id,
      'orderNumber',  NEW.order_number,
      'status',       NEW.shipment_status
    ),
    CASE NEW.shipment_status
      WHEN 'delivered'          THEN 'high'
      WHEN 'cancelled'          THEN 'high'
      WHEN 'failed_to_deliver'  THEN 'high'
      ELSE 'normal'
    END,
    NOW()
  )
  ON CONFLICT DO NOTHING;  -- idempotent: ignore if somehow already inserted

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_buyer_notification ON public.orders;
CREATE TRIGGER trg_order_status_buyer_notification
AFTER UPDATE OF shipment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public._notify_buyer_on_order_status_change();
