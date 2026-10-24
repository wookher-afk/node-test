-- NODE 0.1 / migration 002: transactional bilateral matching.
-- Run AFTER 001_foundation.sql. Execute via trusted backend only.
-- SECURITY: user UUID arguments are NOT authentication; never expose functions as public RPC.
BEGIN;
CREATE TABLE match_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES matches(id),
  event_type text NOT NULL,
  actor_id uuid REFERENCES users(id),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX match_events_match_idx ON match_events(match_id,occurred_at);
CREATE INDEX matches_worker_status_idx ON matches(worker_id,status);
CREATE INDEX matches_position_status_idx ON matches(position_id,status);
CREATE INDEX match_dates_date_idx ON match_dates(work_date);

-- Company-side approver must be an ACTIVE member of the position's owning company.
-- Fine-grained company authorization (DB-005) is not yet implemented: backend MUST check it.
CREATE OR REPLACE FUNCTION node_approve_match(
  p_match_id uuid, p_terms_id uuid, p_party text, p_actor uuid
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_match matches%ROWTYPE;
  v_terms match_terms%ROWTYPE;
  v_company uuid;
BEGIN
  IF p_party NOT IN ('worker','company') THEN RAISE EXCEPTION 'invalid party'; END IF;
  SELECT * INTO v_match FROM matches WHERE id=p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'match not found'; END IF;
  IF v_match.status <> 'proposed' THEN RAISE EXCEPTION 'match is not proposed'; END IF;
  SELECT * INTO v_terms FROM match_terms WHERE id=p_terms_id AND match_id=p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'terms do not belong to match'; END IF;
  IF EXISTS (SELECT 1 FROM match_terms WHERE match_id=p_match_id AND version>v_terms.version) THEN
    RAISE EXCEPTION 'approval must use latest terms';
  END IF;
  IF p_party='worker' THEN
    IF v_match.worker_id<>p_actor THEN RAISE EXCEPTION 'wrong worker'; END IF;
  ELSE
    SELECT s.company_id INTO v_company FROM job_positions p JOIN jobsites s ON s.id=p.jobsite_id
      WHERE p.id=v_match.position_id;
    IF NOT EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id=v_company
      AND cm.user_id=p_actor AND cm.member_status='active') THEN
      RAISE EXCEPTION 'actor is not active company member';
    END IF;
  END IF;
  INSERT INTO match_approvals(match_terms_id,party_role,approved_by)
    VALUES(p_terms_id,p_party,p_actor)
    ON CONFLICT(match_terms_id,party_role) DO UPDATE
    SET approved_by=EXCLUDED.approved_by,approved_at=now();
  INSERT INTO match_events(match_id,event_type,actor_id,details)
    VALUES(p_match_id,'terms_approved',p_actor,jsonb_build_object('terms_id',p_terms_id,'party',p_party));
  RETURN 'approved';
END $$;

-- Concurrency protection: deterministic advisory transaction locks for EVERY
-- worker/day and position/day touched by the match. All confirmers use this function.
CREATE OR REPLACE FUNCTION node_confirm_match(p_match_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_match matches%ROWTYPE;
  v_terms match_terms%ROWTYPE;
  v_lock bigint;
  v_date date;
  v_capacity integer;
  v_taken bigint;
BEGIN
  -- Do not lock the match row before advisory locks: avoids match-row/worker-day lock inversion.
  SELECT * INTO v_match FROM matches WHERE id=p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'match not found'; END IF;
  IF v_match.status <> 'proposed' THEN RAISE EXCEPTION 'match not proposed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM match_dates WHERE match_id=p_match_id) THEN
    RAISE EXCEPTION 'match has no work dates';
  END IF;
  -- Sort all lock keys globally to avoid deadlocks across multi-day matches.
  FOR v_lock IN
    SELECT DISTINCT hashtextextended(k,0)
    FROM (
      SELECT 'worker:'||v_match.worker_id::text||':'||d.work_date::text AS k
        FROM match_dates d WHERE d.match_id=p_match_id
      UNION ALL
      SELECT 'position:'||v_match.position_id::text||':'||d.work_date::text
        FROM match_dates d WHERE d.match_id=p_match_id
    ) keys ORDER BY 1
  LOOP PERFORM pg_advisory_xact_lock(v_lock); END LOOP;
  SELECT * INTO v_match FROM matches WHERE id=p_match_id FOR UPDATE;
  IF v_match.status <> 'proposed' THEN RAISE EXCEPTION 'match state changed'; END IF;
  SELECT * INTO v_terms FROM match_terms WHERE match_id=p_match_id ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'missing terms'; END IF;
  IF (SELECT count(DISTINCT party_role) FROM match_approvals WHERE match_terms_id=v_terms.id) <> 2 THEN
    RAISE EXCEPTION 'both parties must approve latest terms';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM job_positions WHERE id=v_match.position_id AND status='open') THEN
    RAISE EXCEPTION 'position not open';
  END IF;
  FOR v_date IN SELECT work_date FROM match_dates WHERE match_id=p_match_id ORDER BY work_date LOOP
    SELECT capacity INTO v_capacity FROM job_position_dates
      WHERE position_id=v_match.position_id AND work_date=v_date;
    IF NOT FOUND THEN RAISE EXCEPTION 'date not offered: %',v_date; END IF;
    SELECT count(*) INTO v_taken FROM matches m
      JOIN match_dates md ON md.match_id=m.id
      WHERE m.position_id=v_match.position_id AND m.status IN ('confirmed','completed')
        AND md.work_date=v_date;
    IF v_taken>=v_capacity THEN RAISE EXCEPTION 'capacity full on %',v_date; END IF;
    IF EXISTS (
      SELECT 1 FROM matches m JOIN match_dates md ON md.match_id=m.id
      WHERE m.worker_id=v_match.worker_id AND m.id<>p_match_id
        AND m.status IN ('confirmed','completed') AND md.work_date=v_date
    ) THEN RAISE EXCEPTION 'worker already booked on %',v_date; END IF;
  END LOOP;
  UPDATE matches SET status='confirmed' WHERE id=p_match_id;
  INSERT INTO match_events(match_id,event_type,details)
    VALUES(p_match_id,'confirmed',jsonb_build_object('terms_id',v_terms.id));
  RETURN 'confirmed';
END $$;

-- Cancellation retains historical records and releases future quota.
CREATE OR REPLACE FUNCTION node_cancel_match(p_match_id uuid,p_actor uuid,p_reason text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_match matches%ROWTYPE;
BEGIN
  IF nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'reason required'; END IF;
  SELECT * INTO v_match FROM matches WHERE id=p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'match not found'; END IF;
  IF v_match.status NOT IN ('proposed','confirmed') THEN RAISE EXCEPTION 'cannot cancel match'; END IF;
  UPDATE matches SET status='cancelled' WHERE id=p_match_id;
  INSERT INTO match_events(match_id,event_type,actor_id,details)
    VALUES(p_match_id,'cancelled',p_actor,jsonb_build_object('reason',p_reason,'prior_status',v_match.status));
  RETURN 'cancelled';
END $$;
COMMIT;
