-- NODE 0.1 / migration 003: prevent unrelated users cancelling matches.
-- IMPORTANT: server must bind p_actor to authenticated session identity.
BEGIN;
CREATE OR REPLACE FUNCTION node_cancel_match(p_match_id uuid,p_actor uuid,p_reason text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_match matches%ROWTYPE; v_company uuid;
BEGIN
  IF nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'reason required'; END IF;
  SELECT * INTO v_match FROM matches WHERE id=p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'match not found'; END IF;
  SELECT s.company_id INTO v_company
  FROM job_positions p JOIN jobsites s ON s.id=p.jobsite_id
  WHERE p.id=v_match.position_id;
  IF p_actor IS NULL OR (
    p_actor<>v_match.worker_id AND
    NOT EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id=v_company AND cm.user_id=p_actor
        AND cm.member_status='active'
    )
  ) THEN RAISE EXCEPTION 'actor not authorized to cancel'; END IF;
  IF v_match.status NOT IN ('proposed','confirmed') THEN RAISE EXCEPTION 'cannot cancel match'; END IF;
  UPDATE matches SET status='cancelled' WHERE id=p_match_id;
  INSERT INTO match_events(match_id,event_type,actor_id,details)
  VALUES(p_match_id,'cancelled',p_actor,jsonb_build_object('reason',p_reason,'prior_status',v_match.status));
  RETURN 'cancelled';
END $$;
COMMIT;
