ALTER TABLE public.members ADD COLUMN role text NOT NULL DEFAULT 'member'
  CONSTRAINT members_role_check CHECK (role IN ('member', 'staff'));

-- One-time assignment to verified existing identities, never a live username
-- allowlist: renamed/deleted accounts cannot transfer privileges to a new user.
UPDATE public.members AS m SET role = 'staff'
FROM (VALUES
  ('b6293901-340b-48bd-b370-4e117afb25bd', 'granburstone'),
  ('3a540c99-9af6-437e-a756-73a3f8a942d9', 'bsb_pay2spin'),
  ('f896df6b-ee43-482b-82eb-26e9cbc25650', 'burstatisenzagloria'),
  ('0e52dc89-c900-45a1-b722-c7f621cfa0e0', 'bey_sabbath'),
  ('d83734f9-8321-48b3-b987-f61a562d9cdd', 'alebuck'),
  ('f0c7d4e8-2da4-4142-8a44-5fde925dba44', 'pa_ste_llo'),
  ('028d1132-e7f5-4a3e-9510-e17777bd2ec2', 'martin_luther_spin'),
  ('ef42a9da-f3fc-45f1-bb8f-2e02c57d94e4', 'alfiere')
) AS granted(id, username)
WHERE m.id = granted.id AND lower(m.challonge_username) = granted.username;
