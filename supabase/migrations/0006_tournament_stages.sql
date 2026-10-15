CREATE TABLE public.tournament_stages (
  slug text PRIMARY KEY,
  name text NOT NULL,
  event_date date NOT NULL,
  source_url text NOT NULL,
  attendance integer NOT NULL CHECK (attendance BETWEEN 4 AND 32),
  coefficient_milli integer NOT NULL CHECK (coefficient_milli BETWEEN 650 AND 1050),
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tournament_results (
  stage_slug text NOT NULL REFERENCES public.tournament_stages(slug) ON DELETE CASCADE,
  source_key text NOT NULL,
  display_name text NOT NULL,
  challonge_username text,
  source_challonge_username text,
  member_id text REFERENCES public.members(id) ON DELETE SET NULL,
  group_name text,
  swiss_wins integer NOT NULL CHECK (swiss_wins BETWEEN 0 AND 5),
  swiss_losses integer NOT NULL CHECK (swiss_losses BETWEEN 0 AND 5),
  final_rank integer CHECK (final_rank BETWEEN 1 AND 8),
  base_points integer NOT NULL CHECK (base_points >= 0),
  stage_points integer NOT NULL CHECK (stage_points >= 0),
  PRIMARY KEY (stage_slug, source_key)
);

CREATE INDEX tournament_results_member_points ON public.tournament_results(member_id, stage_points DESC);
CREATE UNIQUE INDEX tournament_results_member_stage ON public.tournament_results(stage_slug, member_id) WHERE member_id IS NOT NULL;

ALTER TABLE public.tournament_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tournament_stages, public.tournament_results FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.tournament_stages, public.tournament_results FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.tournament_stages, public.tournament_results FROM authenticated;
  END IF;
END $$;
