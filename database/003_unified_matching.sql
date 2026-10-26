-- Upgrade database/001 + 002 only. Never apply the retired UUID db/ schema.
-- One transaction: any preflight/DDL failure rolls back the complete upgrade.
BEGIN;
SELECT pg_advisory_xact_lock(710031, 1);
-- Freeze the old schema too: its writers do not yet know the new advisory lock.
LOCK TABLE accounts, account_roles, worker_profiles, organizations,
 organization_memberships, worksites, equipment, job_posts, job_lines,
 job_line_dates, match_terms, match_dates, match_approvals, matches,
 calendar_events, resource_reservations IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF to_regclass('public.users') IS NOT NULL OR to_regclass('public.companies') IS NOT NULL THEN
   RAISE EXCEPTION 'Legacy UUID schema detected; manual mapping is required';
 END IF;
 IF EXISTS (SELECT 1 FROM matches) OR EXISTS (SELECT 1 FROM match_approvals) THEN
   RAISE EXCEPTION 'Existing matching records require an audited migration plan';
 END IF;
END $$;

CREATE TABLE match_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 match_id bigint NOT NULL REFERENCES matches(id),
 event_type text NOT NULL CHECK(event_type IN ('approved','confirmed','cancelled','completed')),
 actor_id bigint REFERENCES accounts(id),
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX match_events_match_idx ON match_events(match_id,created_at);
CREATE INDEX matches_status_idx ON matches(status,terms_id);
CREATE INDEX match_terms_worker_idx ON match_terms(worker_id,job_line_id);
ALTER TABLE matches ADD COLUMN cancelled_by bigint REFERENCES accounts(id);
ALTER TABLE matches ADD COLUMN cancellation_reason text;

-- MVP correctness first: all matching-related writers share a transaction lock.
-- BEFORE STATEMENT is intentional: acquire it before row locks, even for direct SQL.
-- Later replace with ordered per-resource locks only with equivalent race tests.
CREATE FUNCTION node_matching_write_lock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(710031,1);
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['matches','match_terms','match_dates','match_approvals',
   'job_posts','job_lines','job_line_dates','worksites','organization_memberships',
   'worker_profiles','equipment','calendar_events','resource_reservations'] LOOP
   EXECUTE format('CREATE TRIGGER matching_write_lock BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION node_matching_write_lock()',t);
 END LOOP;
END $$;

CREATE FUNCTION node_is_match_party(p_terms bigint,p_party text,p_actor bigint)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT p_actor IS NOT NULL AND CASE p_party
 WHEN 'worker' THEN t.worker_id=p_actor AND EXISTS(SELECT 1 FROM worker_profiles w WHERE w.account_id=p_actor)
 WHEN 'company' THEN EXISTS (
   SELECT 1 FROM job_lines l JOIN job_posts p ON p.id=l.job_post_id
   JOIN worksites s ON s.id=p.worksite_id
   JOIN organization_memberships m ON m.organization_id=s.organization_id
   WHERE l.id=t.job_line_id AND m.account_id=p_actor AND m.role IN ('owner','manager'))
 ELSE false END
 FROM match_terms t WHERE t.id=p_terms
$$;

-- Approvals freeze the complete version, including selected dates. Change terms
-- by inserting a new version; previous approvals never transfer to that version.
CREATE OR REPLACE FUNCTION protect_confirmed_terms() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM match_approvals WHERE terms_id=OLD.id)
    OR EXISTS(SELECT 1 FROM matches WHERE terms_id=OLD.id AND status IN ('confirmed','completed','cancelled')) THEN
   RAISE EXCEPTION 'Approved terms are immutable; create a new version';
 END IF;
 IF TG_OP='UPDATE' AND (NEW.id,NEW.job_line_id,NEW.worker_id,NEW.version) IS DISTINCT FROM
   (OLD.id,OLD.job_line_id,OLD.worker_id,OLD.version) THEN
   RAISE EXCEPTION 'Terms identity is immutable';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;

DROP TRIGGER protect_approvals ON match_approvals;
DROP TRIGGER protect_dates ON match_dates;
CREATE OR REPLACE FUNCTION protect_confirmed_children() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_id bigint; new_id bigint;
BEGIN
 IF TG_OP<>'INSERT' THEN old_id:=OLD.terms_id; END IF;
 IF TG_OP<>'DELETE' THEN new_id:=NEW.terms_id; END IF;
 IF EXISTS(SELECT 1 FROM match_approvals WHERE terms_id IN (old_id,new_id))
    OR EXISTS(SELECT 1 FROM matches WHERE terms_id IN (old_id,new_id) AND status IN ('confirmed','completed','cancelled')) THEN
   RAISE EXCEPTION 'Approved dates are immutable; create a new version';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER protect_dates BEFORE INSERT OR UPDATE OR DELETE ON match_dates
 FOR EACH ROW EXECUTE FUNCTION protect_confirmed_children();

CREATE FUNCTION node_guard_approval() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t match_terms%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Approval history is append only'; END IF;
 SELECT * INTO STRICT t FROM match_terms WHERE id=NEW.terms_id;
 IF NOT node_is_match_party(t.id,NEW.party,NEW.approved_by) THEN
   RAISE EXCEPTION 'Actor not authorized to approve';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM matches WHERE terms_id=t.id AND status='pending') THEN
   RAISE EXCEPTION 'Match is not pending';
 END IF;
 IF EXISTS(SELECT 1 FROM match_terms WHERE job_line_id=t.job_line_id AND worker_id=t.worker_id AND version>t.version) THEN
   RAISE EXCEPTION 'Approval must use latest terms';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_approval BEFORE INSERT OR UPDATE OR DELETE ON match_approvals
 FOR EACH ROW EXECUTE FUNCTION node_guard_approval();
CREATE FUNCTION node_log_approval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO match_events(match_id,event_type,actor_id,details)
 SELECT id,'approved',NEW.approved_by,jsonb_build_object('terms_id',NEW.terms_id,'party',NEW.party)
 FROM matches WHERE terms_id=NEW.terms_id;
 RETURN NEW;
END $$;
CREATE TRIGGER log_approval AFTER INSERT ON match_approvals FOR EACH ROW EXECUTE FUNCTION node_log_approval();

-- Full Korea-local calendar days for MVP (half-day/hourly matching is out of scope).
CREATE FUNCTION node_work_period(p_date date) RETURNS tstzrange LANGUAGE sql IMMUTABLE AS $$
 SELECT tstzrange(p_date::timestamp AT TIME ZONE 'Asia/Seoul',
   (p_date+1)::timestamp AT TIME ZONE 'Asia/Seoul','[)')
$$;

DROP TRIGGER check_match_confirmation ON matches;
DROP FUNCTION require_match_confirmation();
CREATE FUNCTION node_guard_match() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t match_terms%ROWTYPE; d date; cap integer; booked bigint; line job_lines%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Match history cannot be deleted'; END IF;
 IF TG_OP='INSERT' THEN
   IF NEW.status<>'pending' OR NEW.cancelled_by IS NOT NULL OR NEW.cancellation_reason IS NOT NULL THEN
     RAISE EXCEPTION 'New matches must be pending';
   END IF;
   RETURN NEW;
 END IF;
 IF NEW.id<>OLD.id OR NEW.terms_id<>OLD.terms_id THEN RAISE EXCEPTION 'Match identity is immutable'; END IF;
 IF NEW.status=OLD.status THEN
   IF (NEW.cancelled_by,NEW.cancellation_reason) IS DISTINCT FROM (OLD.cancelled_by,OLD.cancellation_reason) THEN
     RAISE EXCEPTION 'Cancellation history is immutable';
   END IF;
   RETURN NEW;
 END IF;
 IF OLD.status IN ('cancelled','completed') THEN RAISE EXCEPTION 'Terminal match is immutable'; END IF;
 SELECT * INTO STRICT t FROM match_terms WHERE id=NEW.terms_id;
 IF NEW.status='cancelled' THEN
   IF NOT (coalesce(node_is_match_party(t.id,'worker',NEW.cancelled_by),false)
       OR coalesce(node_is_match_party(t.id,'company',NEW.cancelled_by),false)) THEN
     RAISE EXCEPTION 'Actor not authorized to cancel';
   END IF;
   IF nullif(btrim(NEW.cancellation_reason),'') IS NULL THEN RAISE EXCEPTION 'Cancellation reason required'; END IF;
   RETURN NEW;
 END IF;
 IF NEW.cancelled_by IS NOT NULL OR NEW.cancellation_reason IS NOT NULL THEN RAISE EXCEPTION 'Unexpected cancellation metadata'; END IF;
 IF OLD.status='confirmed' AND NEW.status='completed' THEN RETURN NEW; END IF;
 IF OLD.status<>'pending' OR NEW.status<>'confirmed' THEN RAISE EXCEPTION 'Invalid match transition'; END IF;
 IF EXISTS(SELECT 1 FROM match_terms WHERE job_line_id=t.job_line_id AND worker_id=t.worker_id AND version>t.version) THEN
   RAISE EXCEPTION 'Outdated terms version';
 END IF;
 IF (SELECT count(*) FROM match_approvals WHERE terms_id=t.id)<>2
    OR EXISTS(SELECT 1 FROM match_approvals a WHERE a.terms_id=t.id AND NOT node_is_match_party(t.id,a.party,a.approved_by)) THEN
   RAISE EXCEPTION 'Both authorized parties must approve latest terms';
 END IF;
 SELECT * INTO STRICT line FROM job_lines WHERE id=t.job_line_id;
 IF NOT EXISTS(SELECT 1 FROM job_posts WHERE id=line.job_post_id AND status='open') THEN
   RAISE EXCEPTION 'Job post is not open';
 END IF;
 IF line.resource_mode='worker' AND t.equipment_id IS NOT NULL THEN RAISE EXCEPTION 'Worker-only match cannot reserve equipment'; END IF;
 -- Equipment-only counterparty authorization needs its own later API/policy.
 IF line.resource_mode='equipment' THEN RAISE EXCEPTION 'Equipment-only matching is not supported yet'; END IF;
 IF line.resource_mode='equipment_and_worker' AND (t.equipment_id IS NULL OR NOT EXISTS(
   SELECT 1 FROM equipment e WHERE e.id=t.equipment_id AND (e.owner_account_id=t.worker_id OR EXISTS(
     SELECT 1 FROM organization_memberships m WHERE m.organization_id=e.owner_organization_id
       AND m.account_id=t.worker_id AND m.role IN ('owner','manager'))))) THEN
   RAISE EXCEPTION 'Worker must control the supplied equipment';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM match_dates WHERE terms_id=t.id) THEN RAISE EXCEPTION 'At least one work date required'; END IF;
 IF NOT line.allow_partial AND EXISTS(
   SELECT work_date FROM job_line_dates WHERE job_line_id=line.id
   EXCEPT SELECT work_date FROM match_dates WHERE terms_id=t.id) THEN
   RAISE EXCEPTION 'Partial dates not allowed';
 END IF;
 FOR d IN SELECT work_date FROM match_dates WHERE terms_id=t.id ORDER BY work_date LOOP
   SELECT capacity INTO cap FROM job_line_dates WHERE job_line_id=line.id AND work_date=d;
   IF NOT FOUND THEN RAISE EXCEPTION 'Date not offered'; END IF;
   SELECT count(*) INTO booked FROM matches m JOIN match_terms mt ON mt.id=m.terms_id
     JOIN match_dates md ON md.terms_id=mt.id
     WHERE mt.job_line_id=line.id AND md.work_date=d AND m.status IN ('confirmed','completed');
   IF booked>=cap THEN RAISE EXCEPTION 'Job capacity exceeded'; END IF;
   IF EXISTS(SELECT 1 FROM calendar_events c WHERE c.period && node_work_period(d)
     AND (c.account_id=t.worker_id OR c.equipment_id=t.equipment_id)) THEN
     RAISE EXCEPTION 'Resource calendar is unavailable';
   END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_match BEFORE INSERT OR UPDATE OR DELETE ON matches FOR EACH ROW EXECUTE FUNCTION node_guard_match();

CREATE FUNCTION node_apply_match_state() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t match_terms%ROWTYPE; d date;
BEGIN
 IF NEW.status=OLD.status THEN RETURN NEW; END IF;
 SELECT * INTO STRICT t FROM match_terms WHERE id=NEW.terms_id;
 IF NEW.status='confirmed' THEN
   FOR d IN SELECT work_date FROM match_dates WHERE terms_id=t.id ORDER BY work_date LOOP
     INSERT INTO resource_reservations(match_id,account_id,period) VALUES(NEW.id,t.worker_id,node_work_period(d));
     IF t.equipment_id IS NOT NULL THEN
       INSERT INTO resource_reservations(match_id,equipment_id,period) VALUES(NEW.id,t.equipment_id,node_work_period(d));
     END IF;
   END LOOP;
 ELSIF NEW.status='cancelled' THEN
   UPDATE resource_reservations SET status='released' WHERE match_id=NEW.id AND status='confirmed';
 END IF;
 INSERT INTO match_events(match_id,event_type,actor_id,details)
 VALUES(NEW.id,NEW.status,CASE WHEN NEW.status='cancelled' THEN NEW.cancelled_by END,
   jsonb_build_object('terms_id',t.id,'prior_status',OLD.status,'reason',NEW.cancellation_reason));
 RETURN NEW;
END $$;
CREATE TRIGGER apply_match_state AFTER UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION node_apply_match_state();

-- Quota changes and calendar writes use the same lock and cannot break reservations.
CREATE FUNCTION node_guard_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE booked bigint;
BEGIN
 SELECT count(*) INTO booked FROM matches m JOIN match_terms t ON t.id=m.terms_id
 JOIN match_dates d ON d.terms_id=t.id WHERE t.job_line_id=OLD.job_line_id AND d.work_date=OLD.work_date
 AND m.status IN ('confirmed','completed');
 IF booked>0 AND (TG_OP='DELETE' OR NEW.job_line_id<>OLD.job_line_id OR NEW.work_date<>OLD.work_date OR NEW.capacity<booked) THEN
   RAISE EXCEPTION 'Capacity change would invalidate confirmed matches';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER guard_capacity BEFORE UPDATE OR DELETE ON job_line_dates FOR EACH ROW EXECUTE FUNCTION node_guard_capacity();
CREATE FUNCTION node_guard_calendar() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM resource_reservations r WHERE r.status='confirmed' AND r.period && NEW.period
   AND (r.account_id=NEW.account_id OR r.equipment_id=NEW.equipment_id)) THEN
   RAISE EXCEPTION 'Calendar event conflicts with confirmed reservation';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_calendar BEFORE INSERT OR UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION node_guard_calendar();

-- Reservations tied to active matches may only be released by cancelling the match.
CREATE FUNCTION node_guard_reservation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' AND OLD.match_id IS NOT NULL AND EXISTS(
   SELECT 1 FROM matches WHERE id=OLD.match_id AND status IN ('confirmed','completed')) THEN
   RAISE EXCEPTION 'Active match reservations are immutable';
 END IF;
 IF TG_OP<>'DELETE' AND NEW.status='confirmed' AND EXISTS(
   SELECT 1 FROM calendar_events c WHERE c.period && NEW.period
   AND (c.account_id=NEW.account_id OR c.equipment_id=NEW.equipment_id)) THEN
   RAISE EXCEPTION 'Resource calendar is unavailable';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER guard_reservation BEFORE INSERT OR UPDATE OR DELETE ON resource_reservations FOR EACH ROW EXECUTE FUNCTION node_guard_reservation();

CREATE FUNCTION node_approve_match(p_match bigint,p_terms bigint,p_party text,p_actor bigint)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(710031,1);
 IF NOT EXISTS(SELECT 1 FROM matches WHERE id=p_match AND terms_id=p_terms AND status='pending') THEN
   RAISE EXCEPTION 'Match/terms mismatch or match not pending';
 END IF;
 INSERT INTO match_approvals(terms_id,party,approved_by) VALUES(p_terms,p_party,p_actor);
 RETURN 'approved';
END $$;
CREATE FUNCTION node_confirm_match(p_match bigint) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(710031,1);
 UPDATE matches SET status='confirmed' WHERE id=p_match AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Match not pending'; END IF;
 RETURN 'confirmed';
END $$;
CREATE FUNCTION node_cancel_match(p_match bigint,p_actor bigint,p_reason text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(710031,1);
 UPDATE matches SET status='cancelled',cancelled_by=p_actor,cancellation_reason=p_reason
 WHERE id=p_match AND status IN ('pending','confirmed');
 IF NOT FOUND THEN RAISE EXCEPTION 'Match cannot be cancelled'; END IF;
 RETURN 'cancelled';
END $$;
-- Actor parameters are not authentication. Trusted backend must derive them from
-- its session and check action permissions. No public matching API in this PR.
REVOKE EXECUTE ON FUNCTION node_approve_match(bigint,bigint,text,bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION node_confirm_match(bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION node_cancel_match(bigint,bigint,text) FROM PUBLIC;
COMMIT;
