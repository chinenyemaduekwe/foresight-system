
CREATE TABLE public.accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  arr NUMERIC NOT NULL DEFAULT 0,
  days_to_renewal INTEGER NOT NULL DEFAULT 365,
  champion TEXT,
  champion_status TEXT NOT NULL DEFAULT 'active' CHECK (champion_status IN ('active','quiet','left')),
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accounts are viewable by everyone"
  ON public.accounts FOR SELECT
  USING (true);
