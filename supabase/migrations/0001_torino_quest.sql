CREATE TABLE public.members (
  id text PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  fiscal_code text NOT NULL UNIQUE,
  document_number text NOT NULL,
  email text UNIQUE,
  phone text,
  challonge_username text,
  challonge_id text,
  membership_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_paid boolean NOT NULL DEFAULT false,
  fee_cents integer,
  must_change_password boolean NOT NULL DEFAULT false,
  auth_version integer NOT NULL DEFAULT 0,
  avatar_style integer NOT NULL DEFAULT 0,
  avatar_color integer NOT NULL DEFAULT 0,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at text NOT NULL
);
CREATE TABLE public.guild_messages (
  id text PRIMARY KEY,
  member_id text NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  day text NOT NULL,
  body text NOT NULL,
  created_at text NOT NULL
);
CREATE UNIQUE INDEX guild_messages_member_day_unique ON public.guild_messages(member_id, day);
CREATE INDEX guild_messages_recent ON public.guild_messages(created_at DESC, id DESC);

-- Access goes through the authenticated Next.js API, never the public Data API.
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.members, public.guild_messages FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.members, public.guild_messages FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.members, public.guild_messages FROM authenticated;
  END IF;
END $$;
