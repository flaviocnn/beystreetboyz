CREATE UNIQUE INDEX members_challonge_username_unique
  ON public.members (lower(challonge_username))
  WHERE challonge_username IS NOT NULL;
