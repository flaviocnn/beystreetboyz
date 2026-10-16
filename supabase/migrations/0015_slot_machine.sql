-- Additive: leave the achievement ledger and all real-money receipts unchanged.
CREATE TABLE beycoin_slot_spins (
  id text PRIMARY KEY,
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  request_key text NOT NULL,
  reels jsonb NOT NULL,
  cost integer NOT NULL CHECK (cost = 1),
  payout integer NOT NULL,
  rule_version integer NOT NULL DEFAULT 1 CHECK (rule_version = 1),
  game_day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slot_valid_reels CHECK (
    jsonb_typeof(reels) = 'array' AND jsonb_array_length(reels) = 3
    AND reels->0 IN ('0'::jsonb, '1'::jsonb, '2'::jsonb, '3'::jsonb)
    AND reels->1 IN ('0'::jsonb, '1'::jsonb, '2'::jsonb, '3'::jsonb)
    AND reels->2 IN ('0'::jsonb, '1'::jsonb, '2'::jsonb, '3'::jsonb)
  ),
  CONSTRAINT slot_correct_payout CHECK (payout = CASE
    WHEN reels->0 = reels->1 AND reels->1 = reels->2 THEN CASE WHEN reels->0 = '3'::jsonb THEN 12 ELSE 4 END
    WHEN reels->0 = reels->1 OR reels->1 = reels->2 OR reels->0 = reels->2 THEN 1 ELSE 0 END)
);
CREATE UNIQUE INDEX slot_request_once ON beycoin_slot_spins(member_id, request_key);
CREATE INDEX slot_member_history ON beycoin_slot_spins(member_id, created_at DESC);
CREATE INDEX slot_daily_count ON beycoin_slot_spins(member_id, game_day);
ALTER TABLE beycoin_slot_spins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON beycoin_slot_spins FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON beycoin_slot_spins FROM anon; END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON beycoin_slot_spins FROM authenticated; END IF;
END $$;
