CREATE TABLE beycoin_blackjack_hands (
  id text PRIMARY KEY,
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  deck jsonb NOT NULL CHECK (jsonb_typeof(deck) = 'array' AND jsonb_array_length(deck) = 52),
  player jsonb NOT NULL CHECK (jsonb_typeof(player) = 'array' AND jsonb_array_length(player) >= 2),
  dealer jsonb NOT NULL CHECK (jsonb_typeof(dealer) = 'array' AND jsonb_array_length(dealer) >= 2),
  cursor integer NOT NULL CHECK (cursor BETWEEN 4 AND 52),
  status text NOT NULL CHECK (status IN ('playing','won','lost','push','blackjack')),
  cost integer NOT NULL CHECK (cost = 2),
  payout integer NOT NULL CHECK (payout = CASE status WHEN 'won' THEN 4 WHEN 'push' THEN 2 WHEN 'blackjack' THEN 5 ELSE 0 END),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  game_day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CHECK ((status = 'playing') = (finished_at IS NULL))
);
CREATE UNIQUE INDEX blackjack_one_active_hand ON beycoin_blackjack_hands(member_id) WHERE status = 'playing';
CREATE INDEX blackjack_member_history ON beycoin_blackjack_hands(member_id, created_at DESC);
CREATE INDEX blackjack_daily_count ON beycoin_blackjack_hands(member_id, game_day);
CREATE TABLE beycoin_blackjack_actions (
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  request_key text NOT NULL,
  hand_id text NOT NULL REFERENCES beycoin_blackjack_hands(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('start','hit','stand')),
  expected_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, request_key),
  CHECK ((action = 'start' AND expected_version IS NULL) OR (action <> 'start' AND expected_version IS NOT NULL AND expected_version >= 0))
);
ALTER TABLE beycoin_blackjack_hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE beycoin_blackjack_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON beycoin_blackjack_hands, beycoin_blackjack_actions FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON beycoin_blackjack_hands, beycoin_blackjack_actions FROM anon; END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON beycoin_blackjack_hands, beycoin_blackjack_actions FROM authenticated; END IF;
END $$;
