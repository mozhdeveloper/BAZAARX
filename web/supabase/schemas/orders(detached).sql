create table public.orders (
  id uuid not null default gen_random_uuid (),
  order_number text not null,
  buyer_id uuid null,
  order_type text not null default 'ONLINE'::text,
  pos_note text null,
  recipient_id uuid null,
  address_id uuid null,
  payment_status text not null default 'pending_payment'::text,
  shipment_status text not null default 'waiting_for_seller'::text,
  paid_at timestamp with time zone null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint orders_pkey primary key (id),
  constraint orders_order_number_key unique (order_number),
  constraint orders_recipient_id_fkey foreign KEY (recipient_id) references order_recipients (id) on delete set null,
  constraint orders_address_id_fkey foreign KEY (address_id) references shipping_addresses (id) on delete set null,
  constraint orders_buyer_id_fkey foreign KEY (buyer_id) references buyers (id) on delete RESTRICT,
  constraint orders_shipment_status_check check (
    (
      shipment_status = any (
        array[
          'waiting_for_seller'::text,
          'processing'::text,
          'ready_to_ship'::text,
          'shipped'::text,
          'out_for_delivery'::text,
          'delivered'::text,
          'failed_to_deliver'::text,
          'received'::text,
          'returned'::text
        ]
      )
    )
  ),
  constraint orders_order_type_check check (
    (
      order_type = any (array['ONLINE'::text, 'OFFLINE'::text])
    )
  ),
  constraint orders_payment_status_check check (
    (
      payment_status = any (
        array[
          'pending_payment'::text,
          'paid'::text,
          'refunded'::text,
          'partially_refunded'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create trigger trg_log_order_status_changes
after
update OF payment_status,
shipment_status on orders for EACH row
execute FUNCTION log_order_status_changes ();

create trigger trg_orders_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_updated_at_column ();