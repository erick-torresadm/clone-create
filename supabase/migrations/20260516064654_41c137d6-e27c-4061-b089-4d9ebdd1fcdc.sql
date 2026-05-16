-- Allow public SELECT (UUID is unguessable; needed for realtime progress view)
CREATE POLICY "Credit purchases: public read"
  ON public.credit_purchases
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Enable realtime
ALTER TABLE public.credit_purchases REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_purchases;