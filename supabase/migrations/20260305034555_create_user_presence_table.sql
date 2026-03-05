  -- Create the user_presence table
  CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID NOT NULL,
    user_type TEXT NOT NULL,
    seller_id UUID,
    is_online BOOLEAN DEFAULT false,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_presence_pkey PRIMARY KEY (user_id, user_type),
    UNIQUE(user_id, user_type, seller_id)
  );

  -- Enable Row Level Security (RLS)
  ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

  -- Create basic security policies so the mobile app can read and write to it
  CREATE POLICY "Enable read access for all users" ON public.user_presence FOR SELECT USING (true);
  CREATE POLICY "Enable insert for all users" ON public.user_presence FOR INSERT WITH CHECK (true);
  CREATE POLICY "Enable update for all users" ON public.user_presence FOR UPDATE USING (true);

  -- Force Supabase to refresh its cache so the mobile app sees the new table immediately
  NOTIFY pgrst, 'reload schema';

  -- Enable Realtime broadcasts for the presence table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;