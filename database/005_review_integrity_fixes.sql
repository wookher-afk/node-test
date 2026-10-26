-- PR #2 independent-review fixes. Additive upgrade AFTER 004.
-- No original account, transaction, payment or observation rows are rewritten.
BEGIN;
SELECT pg_advisory_xact_lock(710031,1);
LOCK TABLE match_terms, matches, job_lines, job_posts, worksites,
 record_cases, case_decisions, activity_records, transaction_reviews,
 worker_preference_versions, hiring_condition_versions, recommendation_impressions
 IN SHARE ROW EXCLUSIVE MODE;

-- Historical identity cannot be recovered from a mutable site hierarchy. For a
-- non-empty DB the operator must supply a complete, independently reviewed map.
CREATE TABLE match_term_parties (
 terms_id bigint PRIMARY KEY REFERENCES match_terms(id),
 organization_id bigint NOT NULL REFERENCES organizations(id),
 origin text NOT NULL CHECK(origin IN ('captured','reviewed_backfill')),
 review_reference text CHECK(review_reference ~ '^[a-zA-Z0-9_.-]{1,128}$'),
 captured_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((origin='reviewed_backfill')=(review_reference IS NOT NULL))
);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM match_terms) THEN
   IF to_regclass('public.node_reviewed_match_parties') IS NULL THEN
     RAISE EXCEPTION 'Reviewed historical organization mapping is required';
   END IF;
   IF EXISTS(SELECT 1 FROM match_terms t WHERE NOT EXISTS(
     SELECT 1 FROM node_reviewed_match_parties r WHERE r.terms_id=t.id)) THEN
     RAISE EXCEPTION 'Historical organization mapping is incomplete';
   END IF;
   INSERT INTO match_term_parties(terms_id,organization_id,origin,review_reference)
     SELECT t.id,r.organization_id,'reviewed_backfill',r.review_reference
     FROM match_terms t JOIN node_reviewed_match_parties r ON r.terms_id=t.id;
   REVOKE ALL ON node_reviewed_match_parties FROM PUBLIC;
 END IF;
END $$;
CREATE TRIGGER immutable_parties BEFORE UPDATE OR DELETE ON match_term_parties
 FOR EACH ROW EXECUTE FUNCTION node_record_immutable();
CREATE FUNCTION node_capture_term_party() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO match_term_parties(terms_id,organization_id,origin)
 VALUES(NEW.id,node_job_organization(NEW.job_line_id),'captured');
 RETURN NEW;
END $$;
CREATE TRIGGER capture_term_party AFTER INSERT ON match_terms
 FOR EACH ROW EXECUTE FUNCTION node_capture_term_party();
CREATE FUNCTION node_term_organization(p_terms bigint) RETURNS bigint LANGUAGE sql STABLE AS $$
 SELECT organization_id FROM match_term_parties WHERE terms_id=p_terms
$$;
CREATE OR REPLACE FUNCTION node_is_match_party(p_terms bigint,p_party text,p_actor bigint)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT p_actor IS NOT NULL AND CASE p_party
 WHEN 'worker' THEN t.worker_id=p_actor AND EXISTS(SELECT 1 FROM worker_profiles WHERE account_id=p_actor)
 WHEN 'company' THEN EXISTS(SELECT 1 FROM organization_memberships m
   WHERE m.organization_id=node_term_organization(t.id) AND m.account_id=p_actor AND m.role IN ('owner','manager'))
 ELSE false END FROM match_terms t WHERE t.id=p_terms
$$;

-- One shared lock orders case opening, decisions and replacement insertion. Only
-- READ COMMITTED is supported for these writes: RR could retain a pre-lock snapshot.
CREATE FUNCTION node_record_write_lock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('transaction_isolation') NOT IN ('read committed','read uncommitted') THEN
   RAISE EXCEPTION 'Record writes require READ COMMITTED isolation';
 END IF;
 PERFORM pg_advisory_xact_lock(710031,1);
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['record_cases','case_decisions','activity_records','transaction_reviews',
   'worker_preference_versions','hiring_condition_versions','recommendation_impressions'] LOOP
   EXECUTE format('CREATE TRIGGER record_write_lock BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION node_record_write_lock()',t);
 END LOOP;
END $$;
-- Do not order future authority by user-supplied decided_at or case creation ID.
CREATE TABLE case_decision_order (
 case_id bigint PRIMARY KEY REFERENCES case_decisions(case_id),
 decision_order bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 origin text NOT NULL DEFAULT 'captured' CHECK(origin IN ('captured','reviewed_backfill')),
 review_reference text CHECK(review_reference ~ '^[a-zA-Z0-9_.-]{1,128}$'),
 CHECK((origin='reviewed_backfill')=(review_reference IS NOT NULL))
);
-- Old timestamps were caller-supplied. Their authoritative order must be reviewed,
-- just as historical company attribution must be reviewed; never guess either.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM case_decisions) THEN
   IF to_regclass('public.node_reviewed_case_decisions') IS NULL THEN
     RAISE EXCEPTION 'Reviewed historical decision order is required';
   END IF;
   IF EXISTS(SELECT 1 FROM case_decisions d WHERE NOT EXISTS(
     SELECT 1 FROM node_reviewed_case_decisions r WHERE r.case_id=d.case_id)) THEN
     RAISE EXCEPTION 'Historical decision order is incomplete';
   END IF;
   INSERT INTO case_decision_order(case_id,origin,review_reference)
     SELECT d.case_id,'reviewed_backfill',r.review_reference FROM case_decisions d
     JOIN node_reviewed_case_decisions r ON r.case_id=d.case_id ORDER BY r.decision_order;
   REVOKE ALL ON node_reviewed_case_decisions FROM PUBLIC;
 END IF;
END $$;
CREATE TRIGGER immutable_decision_order BEFORE UPDATE OR DELETE ON case_decision_order
 FOR EACH ROW EXECUTE FUNCTION node_record_immutable();
CREATE FUNCTION node_capture_decision_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN INSERT INTO case_decision_order(case_id) VALUES(NEW.case_id); RETURN NEW; END $$;
CREATE TRIGGER capture_decision_order AFTER INSERT ON case_decisions
 FOR EACH ROW EXECUTE FUNCTION node_capture_decision_order();
CREATE FUNCTION node_effective_record_decision(p_activity bigint,p_review bigint)
RETURNS TABLE(case_id bigint,outcome text) LANGUAGE sql VOLATILE AS $$
 SELECT d.case_id,d.outcome FROM record_cases c JOIN case_decisions d ON d.case_id=c.id
 JOIN case_decision_order o ON o.case_id=d.case_id
 WHERE (c.activity_id=p_activity OR c.review_id=p_review) AND d.outcome<>'dismissed'
 ORDER BY o.decision_order DESC LIMIT 1
$$;
CREATE FUNCTION node_valid_record_correction(p_case bigint,p_activity bigint,p_review bigint)
RETURNS boolean LANGUAGE sql VOLATILE AS $$
 SELECT EXISTS(SELECT 1 FROM node_effective_record_decision(p_activity,p_review) d
   WHERE d.case_id=p_case AND d.outcome='correction_allowed')
 AND NOT EXISTS(SELECT 1 FROM record_cases c WHERE (c.activity_id=p_activity OR c.review_id=p_review)
   AND NOT EXISTS(SELECT 1 FROM case_decisions d WHERE d.case_id=c.id))
$$;


CREATE OR REPLACE FUNCTION node_activity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t match_terms%ROWTYPE; old_record activity_records%ROWTYPE; obligation payment_obligations%ROWTYPE; e match_events%ROWTYPE;
BEGIN
 SELECT mt.* INTO STRICT t FROM matches m JOIN match_terms mt ON mt.id=m.terms_id WHERE m.id=NEW.match_id;
 IF NEW.source='party_report' AND NOT node_is_match_party(t.id,NEW.reporting_party,NEW.reported_by) THEN
   RAISE EXCEPTION 'Reporter is not the stated transaction party';
 END IF;
 IF NEW.kind IN ('check_in','check_out','work_completion','payment_report','payment_receipt') AND NOT EXISTS(SELECT 1 FROM match_events WHERE match_id=NEW.match_id AND event_type='confirmed') THEN
   RAISE EXCEPTION 'Activity requires a confirmed transaction';
 END IF;
 IF NEW.work_date IS NOT NULL AND NOT EXISTS(SELECT 1 FROM match_dates WHERE terms_id=t.id AND work_date=NEW.work_date) THEN
   RAISE EXCEPTION 'Observation date is outside the match';
 END IF;
 IF NEW.kind IN ('payment_report','payment_receipt') THEN
   SELECT * INTO STRICT obligation FROM payment_obligations WHERE id=NEW.payment_obligation_id;
   IF obligation.match_id IS DISTINCT FROM NEW.match_id OR (obligation.payer_organization_id IS NOT NULL AND obligation.payer_organization_id<>node_term_organization(t.id)) THEN
     RAISE EXCEPTION 'Payment belongs to another match or company';
   END IF;
   IF NEW.supersedes_id IS NULL THEN NEW.due_date_snapshot:=obligation.due_date; END IF;
   IF NEW.payment_claim_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM payment_claims WHERE id=NEW.payment_claim_id AND obligation_id=obligation.id) THEN
     RAISE EXCEPTION 'Payment claim belongs to another obligation';
   END IF;
   IF NEW.payment_claim_id IS NOT NULL AND NEW.amount_krw>(SELECT amount_krw FROM payment_claims WHERE id=NEW.payment_claim_id) THEN
     RAISE EXCEPTION 'Observation amount exceeds linked payment claim';
   END IF;
   IF NEW.source='party_report' AND NEW.reporting_party<>(CASE WHEN NEW.kind='payment_report' THEN 'company' ELSE 'worker' END) THEN
     RAISE EXCEPTION 'Payment report/receipt must be recorded by its respective party';
   END IF;
 END IF;
 IF NEW.source_match_event_id IS NOT NULL THEN
   SELECT * INTO STRICT e FROM match_events WHERE id=NEW.source_match_event_id;
   IF e.match_id<>NEW.match_id OR NEW.source<>'system_event' OR NEW.occurred_at IS DISTINCT FROM e.created_at
     OR (NEW.kind<>'rehired' AND NEW.reported_by IS DISTINCT FROM e.actor_id) OR NOT(
     (e.event_type='confirmed' AND NEW.kind IN ('match_confirmed','rehired')) OR
     (e.event_type='cancelled' AND NEW.kind='match_cancelled') OR
     (e.event_type='completed' AND NEW.kind='match_completed')) THEN
     RAISE EXCEPTION 'Lifecycle source does not match observation';
   END IF;
 END IF;
 IF NEW.kind='conditions_change' AND NOT EXISTS(SELECT 1 FROM match_terms WHERE id=NEW.previous_terms_id
   AND job_line_id=t.job_line_id AND worker_id=t.worker_id AND version<t.version
   AND node_term_organization(id)=node_term_organization(t.id)) THEN
   RAISE EXCEPTION 'Previous conditions must belong to the same worker and job';
 END IF;
 IF NEW.kind='rehired' AND NOT EXISTS(SELECT 1 FROM matches m JOIN match_terms mt ON mt.id=m.terms_id
   WHERE m.id=NEW.related_match_id AND m.id<>NEW.match_id AND m.status='completed' AND mt.worker_id=t.worker_id
   AND node_term_organization(mt.id)=node_term_organization(t.id)) THEN
   RAISE EXCEPTION 'Rehire requires an earlier completed transaction with the same parties';
 END IF;
 IF NEW.supersedes_id IS NOT NULL THEN
   SELECT * INTO STRICT old_record FROM activity_records WHERE id=NEW.supersedes_id;
   IF (NEW.match_id,NEW.kind) IS DISTINCT FROM (old_record.match_id,old_record.kind)
      OR NOT node_valid_record_correction(NEW.correction_case_id,old_record.id,NULL) THEN
     RAISE EXCEPTION 'Replacement needs an approved correction for the same record';
   END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION node_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE terms bigint; previous transaction_reviews%ROWTYPE;
BEGIN
 SELECT terms_id INTO STRICT terms FROM matches WHERE id=NEW.match_id AND status IN ('completed','cancelled');
 IF NOT node_is_match_party(terms,NEW.reviewer_party,NEW.author_id)
   OR NOT EXISTS(SELECT 1 FROM match_events WHERE match_id=NEW.match_id AND event_type='confirmed') THEN
   RAISE EXCEPTION 'Review requires an actual transaction and authorized author';
 END IF;
 IF NEW.supersedes_id IS NOT NULL THEN
   SELECT * INTO STRICT previous FROM transaction_reviews WHERE id=NEW.supersedes_id;
   IF (NEW.match_id,NEW.reviewer_party,NEW.author_id,NEW.version) IS DISTINCT FROM
     (previous.match_id,previous.reviewer_party,previous.author_id,previous.version+1)
     OR NOT node_valid_record_correction(NEW.correction_case_id,NULL,previous.id) THEN
     RAISE EXCEPTION 'Review replacement needs an approved correction';
   END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION node_capture_match_record() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t match_terms%ROWTYPE; previous bigint;
BEGIN
 IF NEW.event_type NOT IN ('confirmed','cancelled','completed') THEN RETURN NEW; END IF;
 SELECT mt.* INTO STRICT t FROM matches m JOIN match_terms mt ON mt.id=m.terms_id WHERE m.id=NEW.match_id;
 INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,source_match_event_id)
 VALUES(NEW.match_id,'match_'||NEW.event_type,NEW.created_at,'system_event',NEW.actor_id,'system',NEW.id);
 IF NEW.event_type IN ('confirmed','cancelled') THEN
   INSERT INTO recommendation_outcomes(worker_id,job_line_id,kind,match_id,actor_id,source,source_match_event_id,occurred_at)
   VALUES(t.worker_id,t.job_line_id,CASE WHEN NEW.event_type='confirmed' THEN 'matched' ELSE 'cancelled' END,NEW.match_id,NEW.actor_id,'server',NEW.id,NEW.created_at);
 END IF;
 IF NEW.event_type='confirmed' THEN
   SELECT m.id INTO previous FROM matches m JOIN match_terms mt ON mt.id=m.terms_id
   WHERE m.id<>NEW.match_id AND m.status='completed' AND mt.worker_id=t.worker_id
   AND node_term_organization(mt.id)=node_term_organization(t.id)
   ORDER BY m.id DESC LIMIT 1;
   IF previous IS NOT NULL THEN
     INSERT INTO activity_records(match_id,kind,occurred_at,source,reporting_party,related_match_id,source_match_event_id)
     VALUES(NEW.match_id,'rehired',NEW.created_at,'system_event','system',previous,NEW.id);
   END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION node_capture_condition_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t match_terms%ROWTYPE; previous bigint;
BEGIN
 SELECT * INTO STRICT t FROM match_terms WHERE id=NEW.terms_id;
 SELECT id INTO previous FROM match_terms WHERE job_line_id=t.job_line_id AND worker_id=t.worker_id
 AND version<t.version AND node_term_organization(id)=node_term_organization(t.id) ORDER BY version DESC LIMIT 1;
 IF previous IS NOT NULL THEN
   INSERT INTO activity_records(match_id,kind,occurred_at,source,reporting_party,previous_terms_id)
   VALUES(NEW.id,'conditions_change',t.created_at,'server_snapshot','system',previous);
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE VIEW effective_activity_records AS
 SELECT r.*, CASE
 WHEN EXISTS(SELECT 1 FROM activity_records n WHERE n.supersedes_id=r.id) THEN 'superseded'
 WHEN EXISTS(SELECT 1 FROM record_cases c WHERE c.activity_id=r.id AND NOT EXISTS(SELECT 1 FROM case_decisions cd WHERE cd.case_id=c.id)) THEN 'disputed'
 WHEN d.outcome='record_voided' THEN 'voided'
 WHEN d.outcome='correction_allowed' THEN 'correction_pending'
 WHEN d.outcome='record_upheld' OR EXISTS(SELECT 1 FROM activity_confirmations a WHERE a.activity_id=r.id) THEN 'confirmed'
 WHEN r.source IN ('system_event','server_snapshot') THEN 'system_recorded' ELSE 'reported' END AS evidence_state
 FROM activity_records r LEFT JOIN LATERAL node_effective_record_decision(r.id,NULL) d ON true;
CREATE OR REPLACE VIEW effective_transaction_reviews AS
 SELECT r.*, CASE
 WHEN EXISTS(SELECT 1 FROM transaction_reviews n WHERE n.supersedes_id=r.id) THEN 'superseded'
 WHEN EXISTS(SELECT 1 FROM record_cases c WHERE c.review_id=r.id AND NOT EXISTS(SELECT 1 FROM case_decisions cd WHERE cd.case_id=c.id)) THEN 'disputed'
 WHEN d.outcome='record_voided' THEN 'voided'
 WHEN d.outcome='correction_allowed' THEN 'correction_pending'
 ELSE 'current' END AS review_state
 FROM transaction_reviews r LEFT JOIN LATERAL node_effective_record_decision(NULL,r.id) d ON true;



CREATE OR REPLACE VIEW trust_evidence_coverage AS
 WITH subjects AS (
   SELECT 'worker'::text AS subject_type,id AS subject_id FROM accounts
   UNION ALL SELECT 'company',id FROM organizations
 ), eligible AS (
   SELECT r.id,r.match_id,r.occurred_at,t.worker_id,node_term_organization(t.id) AS organization_id
   FROM effective_activity_records r JOIN matches m ON m.id=r.match_id JOIN match_terms t ON t.id=m.terms_id
   WHERE r.evidence_state IN ('confirmed','system_recorded')
 )
 SELECT s.subject_type,s.subject_id,count(DISTINCT e.match_id) AS observed_transactions,
 count(e.id) AS observation_count,min(e.occurred_at) AS first_observation_at,max(e.occurred_at) AS last_observation_at,
 CASE WHEN count(e.id)=0 THEN 'no_history' ELSE 'history_available' END AS history_status,
 'not_assessed'::text AS trust_assessment_state
 FROM subjects s LEFT JOIN eligible e ON
   (s.subject_type='worker' AND s.subject_id=e.worker_id) OR
   (s.subject_type='company' AND s.subject_id=e.organization_id)
 GROUP BY s.subject_type,s.subject_id;



CREATE OR REPLACE FUNCTION node_snapshot_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Preference/condition snapshots cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
   IF OLD.sealed_at IS NOT NULL OR NEW.sealed_at IS NULL OR
     (to_jsonb(NEW)-'sealed_at') IS DISTINCT FROM (to_jsonb(OLD)-'sealed_at') THEN
     RAISE EXCEPTION 'Snapshot can only be sealed once; create a new version';
   END IF;
 END IF;
 IF TG_OP='INSERT' THEN
   NEW.created_at:=clock_timestamp();
   IF NEW.sealed_at IS NOT NULL THEN NEW.sealed_at:=NEW.created_at; END IF;
 ELSE
   NEW.sealed_at:=clock_timestamp();
 END IF;
 IF TG_TABLE_NAME='hiring_condition_versions' THEN
   IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM job_lines l WHERE l.id=NEW.job_line_id
     AND (l.occupation_id,l.daily_pay_krw,l.resource_mode,l.allow_partial) IS NOT DISTINCT FROM
       (NEW.occupation_id,NEW.daily_pay_krw,NEW.resource_mode,NEW.allow_partial)) THEN
     RAISE EXCEPTION 'Hiring snapshot must match current job fields';
   END IF;
   IF NOT node_manages_job(NEW.job_line_id,NEW.recorded_by) THEN
     RAISE EXCEPTION 'Only company managers may record hiring conditions';
   END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER preference_snapshot_guard ON worker_preference_versions;
CREATE TRIGGER preference_snapshot_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_preference_versions
 FOR EACH ROW EXECUTE FUNCTION node_snapshot_guard();


CREATE OR REPLACE FUNCTION node_recommendation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m record;
BEGIN
 IF TG_TABLE_NAME='recommendation_impressions' THEN
   IF (NEW.direction='jobs_for_worker' AND NEW.viewer_id<>NEW.worker_id)
     OR (NEW.direction='workers_for_company' AND NOT node_manages_job(NEW.job_line_id,NEW.viewer_id)) THEN
     RAISE EXCEPTION 'Recommendation viewer does not own this context';
   END IF;
   IF NEW.preference_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM worker_preference_versions WHERE id=NEW.preference_id AND worker_id=NEW.worker_id AND sealed_at IS NOT NULL) THEN
     RAISE EXCEPTION 'Preference snapshot must be sealed and belong to worker';
   END IF;
   IF NEW.condition_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM hiring_condition_versions WHERE id=NEW.condition_id AND job_line_id=NEW.job_line_id AND sealed_at IS NOT NULL) THEN
     RAISE EXCEPTION 'Hiring snapshot must be sealed and belong to job';
   END IF;
   IF EXISTS(SELECT 1 FROM worker_preference_versions p WHERE p.id=NEW.preference_id
     AND (p.created_at>coalesce(NEW.feature_cutoff_at,NEW.shown_at) OR p.sealed_at>coalesce(NEW.feature_cutoff_at,NEW.shown_at)))
     OR EXISTS(SELECT 1 FROM hiring_condition_versions h WHERE h.id=NEW.condition_id
     AND (h.created_at>coalesce(NEW.feature_cutoff_at,NEW.shown_at) OR h.sealed_at>coalesce(NEW.feature_cutoff_at,NEW.shown_at))) THEN
     RAISE EXCEPTION 'Snapshot was not available at recommendation time';
   END IF;
 ELSE
   IF NEW.impression_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM recommendation_impressions WHERE id=NEW.impression_id AND worker_id=NEW.worker_id AND job_line_id=NEW.job_line_id) THEN
     RAISE EXCEPTION 'Outcome belongs to another recommendation pair';
   END IF;
   IF NEW.application_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM applications WHERE id=NEW.application_id AND worker_id=NEW.worker_id AND job_line_id=NEW.job_line_id) THEN
     RAISE EXCEPTION 'Outcome belongs to another application';
   END IF;
   IF NEW.match_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM matches ma JOIN match_terms t ON t.id=ma.terms_id WHERE ma.id=NEW.match_id AND t.worker_id=NEW.worker_id AND t.job_line_id=NEW.job_line_id) THEN
     RAISE EXCEPTION 'Outcome belongs to another match';
   END IF;
   IF NEW.kind='viewed' AND (NEW.actor_id IS NULL OR (NEW.actor_id<>NEW.worker_id AND NOT node_manages_job(NEW.job_line_id,NEW.actor_id))) THEN
     RAISE EXCEPTION 'View requires worker or hiring company actor';
   END IF;
   IF NEW.kind='viewed' AND NEW.impression_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM recommendation_impressions WHERE id=NEW.impression_id AND viewer_id=NEW.actor_id) THEN
     RAISE EXCEPTION 'View actor must match impression viewer';
   END IF;
   IF NEW.kind IN ('applied','withdrawn') AND NEW.actor_id IS DISTINCT FROM NEW.worker_id THEN
     RAISE EXCEPTION 'Worker action requires worker actor';
   END IF;
   IF NEW.application_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM applications WHERE id=NEW.application_id AND status=NEW.kind) THEN
     RAISE EXCEPTION 'Outcome must reflect the recorded application state';
   END IF;
   IF NEW.source_match_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM match_events WHERE id=NEW.source_match_event_id AND match_id=NEW.match_id
     AND event_type=CASE WHEN NEW.kind='matched' THEN 'confirmed' WHEN NEW.kind='cancelled' THEN 'cancelled' END) THEN
     RAISE EXCEPTION 'Outcome must reflect its lifecycle source';
   END IF;
   IF NEW.kind IN ('matched','cancelled') AND NEW.source_match_event_id IS NULL THEN
     RAISE EXCEPTION 'Match outcome requires a lifecycle source';
   END IF;
   IF NEW.kind IN ('selected','rejected') AND NEW.actor_id IS NOT NULL AND NOT coalesce(node_manages_job(NEW.job_line_id,NEW.actor_id),false) THEN
     RAISE EXCEPTION 'Selection requires company authority';
   END IF;
 END IF;
 RETURN NEW;
END $$;


-- Existing invalid references cannot be silently rewritten in an immutable ledger.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM recommendation_impressions i
   LEFT JOIN worker_preference_versions p ON p.id=i.preference_id
   LEFT JOIN hiring_condition_versions h ON h.id=i.condition_id
   WHERE (p.id IS NOT NULL AND (p.sealed_at IS NULL OR p.created_at>coalesce(i.feature_cutoff_at,i.shown_at) OR p.sealed_at>coalesce(i.feature_cutoff_at,i.shown_at)))
      OR (h.id IS NOT NULL AND (h.sealed_at IS NULL OR h.created_at>coalesce(i.feature_cutoff_at,i.shown_at) OR h.sealed_at>coalesce(i.feature_cutoff_at,i.shown_at)))) THEN
   RAISE EXCEPTION 'Existing recommendation chronology requires reviewed remediation';
 END IF;
END $$;



-- Remove default PUBLIC execution from NODE functions, including internal helpers.
-- Invoker rights stay intact; this is NOT a deploy-ready application role grant.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND (p.proname LIKE 'node\_%' ESCAPE '\' OR p.proname LIKE 'protect_confirmed_%') LOOP
   EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC',f.signature);
 END LOOP;
END $$;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON match_term_parties,case_decision_order FROM PUBLIC;
COMMIT;
