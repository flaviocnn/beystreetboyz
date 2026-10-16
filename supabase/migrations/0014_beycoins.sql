ALTER TABLE public.member_achievements
  ADD COLUMN coin_reward integer NOT NULL DEFAULT 0 CHECK (coin_reward >= 0),
  ADD COLUMN coin_credited boolean NOT NULL DEFAULT false,
  ADD COLUMN coin_revision integer NOT NULL DEFAULT 0 CHECK (coin_revision >= 0);
CREATE TABLE public.beycoin_ledger (
  id text PRIMARY KEY,
  member_id text NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  amount integer NOT NULL CHECK (amount <> 0),
  reason text NOT NULL CHECK (reason IN ('award', 'restore', 'revoke')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(member_id, achievement_id) REFERENCES public.member_achievements(member_id, achievement_id) ON DELETE CASCADE,
  CHECK ((reason = 'revoke' AND amount < 0) OR (reason IN ('award','restore') AND amount > 0))
);
CREATE UNIQUE INDEX beycoin_achievement_revision_once ON public.beycoin_ledger(member_id, achievement_id, revision);
CREATE INDEX beycoin_member_history ON public.beycoin_ledger(member_id, created_at);
-- Freeze the initial entitlement, including pre-existing achievements. A
-- correction reverses this amount; restoring never grants an extra net reward.
UPDATE public.member_achievements a SET coin_reward = r.amount,
  coin_credited = a.active, coin_revision = CASE WHEN a.active THEN 1 ELSE 0 END
FROM (VALUES ('welcome',10),('identity',15),('voice',15),('first-stage',25),('regular',40),
  ('top-eight',50),('deck',30),('podiums',100),('winner',150),('attack',200)) AS r(id,amount)
WHERE a.achievement_id = r.id;
INSERT INTO public.beycoin_ledger(id,member_id,achievement_id,revision,amount,reason)
SELECT 'backfill:' || member_id || ':' || achievement_id, member_id, achievement_id, 1, coin_reward, 'award'
FROM public.member_achievements WHERE coin_credited AND coin_reward > 0;
ALTER TABLE public.beycoin_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.beycoin_ledger FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public.beycoin_ledger FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON public.beycoin_ledger FROM authenticated; END IF;
END $$;
