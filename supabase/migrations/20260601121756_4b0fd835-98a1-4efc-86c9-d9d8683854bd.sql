DROP POLICY IF EXISTS "Anyone can insert accounts" ON public.accounts;

CREATE POLICY "Authenticated users can insert accounts"
  ON public.accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

REVOKE INSERT ON public.accounts FROM anon;
GRANT INSERT ON public.accounts TO authenticated;