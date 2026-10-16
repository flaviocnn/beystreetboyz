-- Explicit owner operation, not an automatic migration. Run transactionally
-- after a private backup. Preserve identities, colors and all other rewards.
DO $$
DECLARE
  targets text[]; target text; was_active boolean; was_credited boolean;
  reward integer; revision integer;
BEGIN
  SELECT array_agg(id) INTO targets FROM members WHERE lower(challonge_username) = 'alebuck';
  IF coalesce(cardinality(targets), 0) <> 1 THEN RAISE EXCEPTION 'Expected exactly one Alebuck'; END IF;
  target := targets[1];
  PERFORM pg_advisory_xact_lock(hashtextextended('achievements:' || target, 0));
  SELECT active, coin_credited, coin_reward, coin_revision INTO was_active, was_credited, reward, revision
    FROM member_achievements WHERE member_id = target AND achievement_id = 'demon-slayer' FOR UPDATE;
  reward := CASE WHEN coalesce(reward, 0) > 0 THEN reward ELSE 50 END;
  revision := coalesce(revision, 0);
  INSERT INTO member_achievements(member_id, achievement_id, active, evidence, coin_reward)
    VALUES(target, 'demon-slayer', true, '{"manual":true,"grantedBy":"guild-owner"}', reward)
    ON CONFLICT(member_id, achievement_id) DO UPDATE SET active = true,
      evidence = member_achievements.evidence || '{"manual":true,"grantedBy":"guild-owner"}'::jsonb;
  IF NOT coalesce(was_credited, false) THEN
    revision := revision + 1;
    INSERT INTO beycoin_ledger(id,member_id,achievement_id,revision,amount,reason)
      VALUES('manual:demon-slayer:' || target || ':' || revision, target, 'demon-slayer', revision, reward,
        CASE WHEN revision = 1 THEN 'award' ELSE 'restore' END);
    UPDATE member_achievements SET coin_reward = reward, coin_credited = true, coin_revision = revision
      WHERE member_id = target AND achievement_id = 'demon-slayer';
  END IF;
  IF NOT coalesce(was_active, false) THEN
    INSERT INTO member_achievement_audit(id,member_id,achievement_id,action,evidence)
      VALUES('manual:demon-slayer:' || target || ':' || revision, target, 'demon-slayer',
        CASE WHEN was_active IS NULL THEN 'unlock' ELSE 'restore' END, '{"manual":true,"grantedBy":"guild-owner"}');
  END IF;
  UPDATE members m SET avatar_style = CASE WHEN avatar_style = 23 THEN 12 ELSE 0 END
    WHERE avatar_style IN (11,23) AND NOT EXISTS (
      SELECT 1 FROM member_achievements a WHERE a.member_id = m.id AND a.achievement_id = 'demon-slayer' AND a.active);
END $$;
