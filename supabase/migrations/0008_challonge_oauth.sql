CREATE TABLE public.challonge_identities (
  challonge_id text PRIMARY KEY,
  member_id text NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE
);
CREATE TABLE public.oauth_attempts (
  state_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
CREATE INDEX oauth_attempts_expiry ON public.oauth_attempts(expires_at);
ALTER TABLE public.challonge_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.challonge_identities, public.oauth_attempts FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.challonge_identities, public.oauth_attempts FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.challonge_identities, public.oauth_attempts FROM authenticated;
  END IF;
END $$;
