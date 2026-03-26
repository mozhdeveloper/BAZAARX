-- Enable auto-cancel cron job for unconfirmed orders
-- Runs every hour at minute 15
-- Cancels orders older than 3 days in 'waiting_for_seller' status

-- Schedule the auto-cancel job to run every hour, if pg_cron is available
do
$$
begin
  if exists (
    select 1
    from pg_extension
    where extname = 'pg_cron'
  ) then
    perform cron.schedule(
      'auto-cancel-unconfirmed-orders',
      '15 * * * *',
      $cron$
        select count(*)
        from public.auto_cancel_unconfirmed_orders(3, 500);
      $cron$
    );
  end if;
end;
$$;
