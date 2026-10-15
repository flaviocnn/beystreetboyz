CREATE TABLE public.checkin_events (
  id text PRIMARY KEY,
  tournament_id text NOT NULL UNIQUE,
  tournament_ref text NOT NULL,
  source_url text NOT NULL,
  name text NOT NULL,
  event_date date NOT NULL,
  fee_cents integer NOT NULL CHECK (fee_cents BETWEEN 0 AND 1000000),
  last_synced_at timestamptz NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.checkin_participants (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES public.checkin_events(id),
  participant_id text NOT NULL,
  display_name text NOT NULL,
  challonge_username text,
  member_id text REFERENCES public.members(id) ON DELETE SET NULL,
  registered boolean NOT NULL DEFAULT true,
  presence text NOT NULL DEFAULT 'pending' CHECK (presence IN ('pending','present','absent')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  paid_cents integer,
  payment_method text CHECK (payment_method IN ('cash','card','bank','other')),
  paid_at timestamptz,
  paid_by text,
  version integer NOT NULL DEFAULT 0,
  CHECK ((payment_status = 'unpaid' AND paid_cents IS NULL AND payment_method IS NULL AND paid_at IS NULL AND paid_by IS NULL)
    OR (payment_status = 'paid' AND paid_cents >= 0 AND payment_method IS NOT NULL AND paid_at IS NOT NULL AND paid_by IS NOT NULL)),
  CONSTRAINT checkin_participant_once UNIQUE(event_id, participant_id)
);
CREATE UNIQUE INDEX checkin_member_once ON public.checkin_participants(event_id,member_id) WHERE member_id IS NOT NULL;
CREATE INDEX checkin_event_date ON public.checkin_events(event_date DESC);
CREATE TABLE public.checkin_audit (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES public.checkin_events(id),
  participant_id text NOT NULL REFERENCES public.checkin_participants(id),
  action text NOT NULL,
  actor_id text NOT NULL,
  operator_label text NOT NULL,
  note text NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checkin_audit_event ON public.checkin_audit(event_id,created_at DESC);
ALTER TABLE public.checkin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkin_events,public.checkin_participants,public.checkin_audit FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.checkin_events,public.checkin_participants,public.checkin_audit FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.checkin_events,public.checkin_participants,public.checkin_audit FROM authenticated;
  END IF;
END $$;
