CREATE TABLE public.member_achievement_activity (
  member_id text NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('login', 'avatar')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, kind)
);
CREATE TABLE public.member_achievements (
  member_id text NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  rule_version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (member_id, achievement_id)
);
CREATE TABLE public.member_achievement_profiles (
  member_id text PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  showcase jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(showcase) = 'array' AND jsonb_array_length(showcase) <= 3),
  title_id text
);
CREATE TABLE public.member_achievement_audit (
  id text PRIMARY KEY,
  member_id text NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('unlock', 'revoke', 'restore')),
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_achievement_audit_member ON public.member_achievement_audit(member_id, created_at);
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['member_achievement_activity','member_achievements','member_achievement_profiles','member_achievement_audit'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', tbl);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl); END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', tbl); END IF;
  END LOOP;
END $$;
