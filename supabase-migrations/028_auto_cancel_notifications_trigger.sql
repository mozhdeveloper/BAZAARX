-- Auto-cancellation notifications trigger
-- Creates notifications for buyer and seller when an order is auto-cancelled

-- Function to create notifications for auto-cancelled orders
CREATE OR REPLACE FUNCTION public.fn_create_auto_cancel_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_order RECORD;
  v_buyer_id uuid;
  v_seller_id uuid;
  v_order_number text;
  v_reason text;
BEGIN
  -- Only trigger for auto-cancelled orders
  IF NEW.reason IS NULL OR NEW.reason NOT LIKE '%auto-cancelled%' THEN
    RETURN NEW;
  END IF;

  -- Get order details (orders does not have seller_id, get from order_items -> products)
  SELECT o.id, o.order_number, o.buyer_id
  INTO v_order
  FROM public.orders o
  WHERE o.id = NEW.order_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get seller_id via order_items -> products
  SELECT DISTINCT p.seller_id
  INTO v_seller_id
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = NEW.order_id
  LIMIT 1;

  v_buyer_id := v_order.buyer_id;
  v_order_number := v_order.order_number;
  v_reason := NEW.reason;

  -- Insert buyer notification (only existing columns based on actual schema)
  IF v_buyer_id IS NOT NULL THEN
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
      v_buyer_id,
      'buyer_order_auto_cancelled',
      'Order Auto-Cancelled',
      format('Your order #%s was automatically cancelled. %s', v_order_number, v_reason),
      format('/orders/%s', NEW.order_id),
      jsonb_build_object('orderId', NEW.order_id),
      'high',
      NOW()
    );
  END IF;

  -- Insert seller notification (only existing columns based on actual schema)
  IF v_seller_id IS NOT NULL THEN
    INSERT INTO public.seller_notifications (
      seller_id,
      type,
      title,
      message,
      action_url,
      action_data,
      priority,
      created_at
    ) VALUES (
      v_seller_id,
      'seller_order_auto_cancelled',
      'Order Auto-Cancelled',
      format('Your order #%s was automatically cancelled because you did not confirm in time. %s', v_order_number, v_reason),
      format('/seller/orders/%s', NEW.order_id),
      jsonb_build_object('orderId', NEW.order_id),
      'high',
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to fire after insert on order_cancellations
DROP TRIGGER IF EXISTS trg_auto_cancel_notifications ON public.order_cancellations;

CREATE TRIGGER trg_auto_cancel_notifications
AFTER INSERT ON public.order_cancellations
FOR EACH ROW
EXECUTE FUNCTION public.fn_create_auto_cancel_notifications();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.fn_create_auto_cancel_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_auto_cancel_notifications() TO service_role;