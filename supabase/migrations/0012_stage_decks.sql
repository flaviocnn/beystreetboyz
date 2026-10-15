-- Independent of result rows: a tournament reimport replaces those rows.
CREATE TABLE public.stage_decks (
  stage_slug text NOT NULL REFERENCES public.tournament_stages(slug) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  beys jsonb NOT NULL CHECK (jsonb_typeof(beys) = 'array' AND jsonb_array_length(beys) = 3),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stage_slug, member_id)
);
ALTER TABLE public.stage_decks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stage_decks FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.stage_decks FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.stage_decks FROM authenticated;
  END IF;
END $$;
