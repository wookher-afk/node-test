-- Additive data foundation only: no model, trust score, ranking or public API.
BEGIN;
SELECT pg_advisory_xact_lock(710031,1);
-- Install source hooks and backfill without losing writes at the cutover.
LOCK TABLE match_events, applications, payment_obligations IN SHARE ROW EXCLUSIVE MODE;

-- Fact observations are NOT automatically verified facts. Keep who reported what,
-- when it happened, when it was recorded, and the exact transaction context.
CREATE TABLE activity_records (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 match_id bigint NOT NULL REFERENCES matches(id),
 kind text NOT NULL CHECK(kind IN ('check_in','check_out','work_completion','payment_report',
   'payment_receipt','conditions_change','match_confirmed','match_cancelled','match_completed','rehired')),
 occurred_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 source text NOT NULL CHECK(source IN ('party_report','system_event','server_snapshot')),
 reported_by bigint REFERENCES accounts(id),
 reporting_party text NOT NULL CHECK(reporting_party IN ('worker','company','system')),
 work_date date,
 amount_krw bigint CHECK(amount_krw>0),
 payment_obligation_id bigint REFERENCES payment_obligations(id),
 payment_claim_id bigint REFERENCES payment_claims(id),
 due_date_snapshot date,
 previous_terms_id bigint REFERENCES match_terms(id),
 related_match_id bigint REFERENCES matches(id),
 source_match_event_id bigint REFERENCES match_events(id),
 request_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 supersedes_id bigint UNIQUE REFERENCES activity_records(id),
 correction_case_id bigint,
 CHECK((source='party_report' AND reported_by IS NOT NULL AND reporting_party<>'system')
    OR (source IN ('system_event','server_snapshot') AND reporting_party='system')),
 CHECK(source<>'system_event' OR source_match_event_id IS NOT NULL),
 CHECK(source<>'server_snapshot' OR kind='conditions_change'),
 CHECK((kind IN ('check_in','check_out','work_completion')) = (work_date IS NOT NULL)),
 CHECK((kind IN ('payment_report','payment_receipt')) = (payment_obligation_id IS NOT NULL)),
 CHECK((kind IN ('payment_report','payment_receipt')) = (amount_krw IS NOT NULL)),
 CHECK(kind IN ('payment_report','payment_receipt') OR (payment_claim_id IS NULL AND due_date_snapshot IS NULL)),
 CHECK((kind='conditions_change') = (previous_terms_id IS NOT NULL)),
 CHECK((kind='rehired') = (related_match_id IS NOT NULL)),
 CHECK((supersedes_id IS NULL) = (correction_case_id IS NULL)),
 UNIQUE(kind,source_match_event_id)
);
CREATE INDEX activity_records_match_idx ON activity_records(match_id,occurred_at);
CREATE INDEX activity_records_kind_time_idx ON activity_records(kind,recorded_at);
CREATE UNIQUE INDEX activity_original_payment_idx ON activity_records(kind,payment_claim_id) WHERE payment_claim_id IS NOT NULL AND supersedes_id IS NULL;

-- Subjective reviews and willingness to transact again stay separate from facts.
-- No free-text review, exact location, identity document or bank details here.
CREATE TABLE transaction_reviews (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 match_id bigint NOT NULL REFERENCES matches(id),
 reviewer_party text NOT NULL CHECK(reviewer_party IN ('worker','company')),
 author_id bigint NOT NULL REFERENCES accounts(id),
 version integer NOT NULL CHECK(version>0),
 communication_rating smallint CHECK(communication_rating BETWEEN 1 AND 5),
 agreement_rating smallint CHECK(agreement_rating BETWEEN 1 AND 5),
 would_work_again text NOT NULL CHECK(would_work_again IN ('yes','no','undecided')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 request_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 supersedes_id bigint UNIQUE REFERENCES transaction_reviews(id),
 correction_case_id bigint,
 CHECK((supersedes_id IS NULL AND version=1 AND correction_case_id IS NULL)
    OR (supersedes_id IS NOT NULL AND version>1 AND correction_case_id IS NOT NULL)),
 UNIQUE(match_id,reviewer_party,version)
);
CREATE TABLE record_cases (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 activity_id bigint REFERENCES activity_records(id),
 review_id bigint REFERENCES transaction_reviews(id),
 raised_by bigint NOT NULL REFERENCES accounts(id),
 case_type text NOT NULL CHECK(case_type IN ('dispute','correction','privacy')),
 reason_code text NOT NULL CHECK(reason_code IN ('inaccurate','duplicate','missing_context','privacy','other')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 request_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 CHECK(num_nonnulls(activity_id,review_id)=1)
);
CREATE INDEX record_cases_activity_idx ON record_cases(activity_id) WHERE activity_id IS NOT NULL;
CREATE INDEX record_cases_review_idx ON record_cases(review_id) WHERE review_id IS NOT NULL;
CREATE TABLE case_decisions (
 case_id bigint PRIMARY KEY REFERENCES record_cases(id),
 decided_by bigint NOT NULL REFERENCES accounts(id),
 outcome text NOT NULL CHECK(outcome IN ('record_upheld','record_voided','correction_allowed','dismissed')),
 policy_version text NOT NULL CHECK(policy_version ~ '^[a-zA-Z0-9_.-]{1,64}$'),
 decided_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE activity_records ADD FOREIGN KEY(correction_case_id) REFERENCES record_cases(id);
ALTER TABLE transaction_reviews ADD FOREIGN KEY(correction_case_id) REFERENCES record_cases(id);
CREATE TABLE payment_due_date_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 obligation_id bigint NOT NULL REFERENCES payment_obligations(id),
 previous_due_date date,
 due_date date,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 source text NOT NULL DEFAULT 'database_change' CHECK(source='database_change')
);
CREATE INDEX payment_due_history_obligation_idx ON payment_due_date_history(obligation_id,id);
CREATE TABLE activity_confirmations (
 activity_id bigint PRIMARY KEY REFERENCES activity_records(id),
 confirmed_by bigint NOT NULL REFERENCES accounts(id),
 confirming_party text NOT NULL CHECK(confirming_party IN ('worker','company')),
 confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Explicit, versioned preference snapshots; no behavior-derived preferences yet.
-- Build child rows in one transaction, then seal the snapshot before use.
CREATE TABLE worker_preference_versions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 worker_id bigint NOT NULL REFERENCES worker_profiles(account_id),
 recorded_by bigint NOT NULL REFERENCES accounts(id),
 CHECK(recorded_by=worker_id),
 version integer NOT NULL CHECK(version>0),
 min_pay_krw bigint CHECK(min_pay_krw>=0),
 max_pay_krw bigint CHECK(max_pay_krw>=0 AND (min_pay_krw IS NULL OR max_pay_krw>=min_pay_krw)),
 pay_unit text NOT NULL CHECK(pay_unit IN ('day','month','hour','negotiable')),
 available_from date,
 available_until date CHECK(available_until>=available_from),
 preferred_weekdays smallint[] CHECK(preferred_weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[]),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 sealed_at timestamptz,
 UNIQUE(worker_id,version)
);
CREATE TABLE worker_preference_occupations (
 preference_id bigint NOT NULL REFERENCES worker_preference_versions(id),
 occupation_id bigint NOT NULL REFERENCES occupations(id),
 PRIMARY KEY(preference_id,occupation_id)
);
CREATE TABLE worker_preference_regions (
 preference_id bigint NOT NULL REFERENCES worker_preference_versions(id),
 region_id bigint NOT NULL REFERENCES regions(id),
 PRIMARY KEY(preference_id,region_id)
);
CREATE TABLE hiring_condition_versions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 job_line_id bigint NOT NULL REFERENCES job_lines(id),
 version integer NOT NULL CHECK(version>0),
 recorded_by bigint NOT NULL REFERENCES accounts(id),
 occupation_id bigint NOT NULL REFERENCES occupations(id),
 region_id bigint REFERENCES regions(id),
 daily_pay_krw bigint NOT NULL CHECK(daily_pay_krw>=0),
 min_experience_months integer CHECK(min_experience_months>=0),
 resource_mode text NOT NULL CHECK(resource_mode IN ('worker','equipment_and_worker','equipment')),
 allow_partial boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 sealed_at timestamptz,
 UNIQUE(job_line_id,version)
);
CREATE TABLE hiring_condition_dates (
 condition_id bigint NOT NULL REFERENCES hiring_condition_versions(id),
 work_date date NOT NULL,
 capacity integer NOT NULL CHECK(capacity>0),
 PRIMARY KEY(condition_id,work_date)
);

-- Recommendation feedback is a different dataset from transaction evidence.
-- An impression means actually shown, not merely a generated candidate.
CREATE TABLE recommendation_impressions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 direction text NOT NULL CHECK(direction IN ('jobs_for_worker','workers_for_company')),
 viewer_id bigint NOT NULL REFERENCES accounts(id),
 worker_id bigint NOT NULL REFERENCES worker_profiles(account_id),
 job_line_id bigint NOT NULL REFERENCES job_lines(id),
 preference_id bigint REFERENCES worker_preference_versions(id),
 condition_id bigint REFERENCES hiring_condition_versions(id),
 position integer NOT NULL CHECK(position>0),
 policy_version text NOT NULL CHECK(policy_version ~ '^[a-zA-Z0-9_.-]{1,64}$'),
 shown_at timestamptz NOT NULL,
 feature_cutoff_at timestamptz CHECK(feature_cutoff_at<=shown_at),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 request_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid()
);
CREATE TABLE recommendation_outcomes (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 impression_id bigint REFERENCES recommendation_impressions(id),
 worker_id bigint NOT NULL REFERENCES accounts(id),
 job_line_id bigint NOT NULL REFERENCES job_lines(id),
 kind text NOT NULL CHECK(kind IN ('viewed','applied','selected','rejected','withdrawn','matched','cancelled')),
 actor_id bigint REFERENCES accounts(id),
 application_id bigint REFERENCES applications(id),
 match_id bigint REFERENCES matches(id),
 source text NOT NULL CHECK(source IN ('client','server')),
 source_match_event_id bigint UNIQUE REFERENCES match_events(id),
 occurred_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 request_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 CHECK(kind NOT IN ('matched','cancelled') OR (match_id IS NOT NULL AND source='server')),
 CHECK(kind NOT IN ('applied','selected','rejected','withdrawn') OR (application_id IS NOT NULL AND source='server')),
 CHECK(source<>'client' OR (kind='viewed' AND actor_id IS NOT NULL))
);
CREATE INDEX recommendation_outcomes_pair_idx ON recommendation_outcomes(worker_id,job_line_id,occurred_at);

-- Functional records do not imply permission to train. No consent => no training.
-- Withdrawal is appended, not overwritten. Account and organization consent differ.
CREATE TABLE learning_permission_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 account_id bigint REFERENCES accounts(id),
 organization_id bigint REFERENCES organizations(id),
 recorded_by bigint NOT NULL REFERENCES accounts(id),
 allowed boolean NOT NULL,
 policy_version text NOT NULL CHECK(policy_version ~ '^[a-zA-Z0-9_.-]{1,64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 request_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 CHECK(num_nonnulls(account_id,organization_id)=1)
);

CREATE FUNCTION node_record_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Record history is immutable; use a case and replacement version'; END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['activity_records','transaction_reviews','record_cases','case_decisions',
   'activity_confirmations','payment_due_date_history','recommendation_impressions','recommendation_outcomes','learning_permission_events'] LOOP
   EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION node_record_immutable()',t);
 END LOOP;
END $$;

CREATE FUNCTION node_job_organization(p_line bigint) RETURNS bigint LANGUAGE sql STABLE AS $$
 SELECT s.organization_id FROM job_lines l JOIN job_posts p ON p.id=l.job_post_id
 JOIN worksites s ON s.id=p.worksite_id WHERE l.id=p_line
$$;
CREATE FUNCTION node_manages_job(p_line bigint,p_actor bigint) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM organization_memberships WHERE organization_id=node_job_organization(p_line)
 AND account_id=p_actor AND role IN ('owner','manager'))
$$;
CREATE FUNCTION node_case_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE terms bigint;
BEGIN
 IF TG_TABLE_NAME='case_decisions' THEN
   IF EXISTS(SELECT 1 FROM record_cases WHERE id=NEW.case_id AND raised_by=NEW.decided_by) THEN
     RAISE EXCEPTION 'Case author cannot moderate their own case';
   END IF;
   SELECT m.terms_id INTO terms FROM record_cases c
   JOIN matches m ON m.id=coalesce((SELECT match_id FROM activity_records WHERE id=c.activity_id),
     (SELECT match_id FROM transaction_reviews WHERE id=c.review_id)) WHERE c.id=NEW.case_id;
   IF coalesce(node_is_match_party(terms,'worker',NEW.decided_by),false)
     OR coalesce(node_is_match_party(terms,'company',NEW.decided_by),false) THEN
     RAISE EXCEPTION 'Transaction parties cannot moderate their own case';
   END IF;
   IF NOT EXISTS(SELECT 1 FROM account_roles WHERE account_id=NEW.decided_by AND role='admin') THEN
     RAISE EXCEPTION 'Case resolution requires moderator authority';
   END IF;
 ELSE
   SELECT m.terms_id INTO terms FROM matches m WHERE m.id=coalesce(
     (SELECT match_id FROM activity_records WHERE id=NEW.activity_id),
     (SELECT match_id FROM transaction_reviews WHERE id=NEW.review_id));
   IF NOT(coalesce(node_is_match_party(terms,'worker',NEW.raised_by),false)
       OR coalesce(node_is_match_party(terms,'company',NEW.raised_by),false)
       OR EXISTS(SELECT 1 FROM activity_records WHERE id=NEW.activity_id AND reported_by=NEW.raised_by)
       OR EXISTS(SELECT 1 FROM transaction_reviews WHERE id=NEW.review_id AND author_id=NEW.raised_by)) THEN
     RAISE EXCEPTION 'Only transaction parties may open a record case';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER case_guard BEFORE INSERT ON record_cases FOR EACH ROW EXECUTE FUNCTION node_case_guard();
CREATE TRIGGER decision_guard BEFORE INSERT ON case_decisions FOR EACH ROW EXECUTE FUNCTION node_case_guard();

CREATE FUNCTION node_activity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
   IF obligation.match_id IS DISTINCT FROM NEW.match_id OR (obligation.payer_organization_id IS NOT NULL AND obligation.payer_organization_id<>node_job_organization(t.job_line_id)) THEN
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
   AND job_line_id=t.job_line_id AND worker_id=t.worker_id AND version<t.version) THEN
   RAISE EXCEPTION 'Previous conditions must belong to the same worker and job';
 END IF;
 IF NEW.kind='rehired' AND NOT EXISTS(SELECT 1 FROM matches m JOIN match_terms mt ON mt.id=m.terms_id
   WHERE m.id=NEW.related_match_id AND m.id<>NEW.match_id AND m.status='completed' AND mt.worker_id=t.worker_id
   AND node_job_organization(mt.job_line_id)=node_job_organization(t.job_line_id)) THEN
   RAISE EXCEPTION 'Rehire requires an earlier completed transaction with the same parties';
 END IF;
 IF NEW.supersedes_id IS NOT NULL THEN
   SELECT * INTO STRICT old_record FROM activity_records WHERE id=NEW.supersedes_id;
   IF (NEW.match_id,NEW.kind) IS DISTINCT FROM (old_record.match_id,old_record.kind)
      OR NOT EXISTS(SELECT 1 FROM record_cases c JOIN case_decisions d ON d.case_id=c.id
        WHERE c.id=NEW.correction_case_id AND c.activity_id=old_record.id AND d.outcome='correction_allowed') THEN
     RAISE EXCEPTION 'Replacement needs an approved correction for the same record';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER activity_guard BEFORE INSERT ON activity_records FOR EACH ROW EXECUTE FUNCTION node_activity_guard();
CREATE FUNCTION node_confirmation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r activity_records%ROWTYPE; terms bigint;
BEGIN
 SELECT * INTO STRICT r FROM activity_records WHERE id=NEW.activity_id;
 SELECT terms_id INTO STRICT terms FROM matches WHERE id=r.match_id;
 IF NEW.confirmed_by IS NOT DISTINCT FROM r.reported_by OR NEW.confirming_party=r.reporting_party
   OR NOT node_is_match_party(terms,NEW.confirming_party,NEW.confirmed_by) THEN
   RAISE EXCEPTION 'Independent counterparty confirmation required';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER confirmation_guard BEFORE INSERT ON activity_confirmations FOR EACH ROW EXECUTE FUNCTION node_confirmation_guard();
CREATE FUNCTION node_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
     OR NOT EXISTS(SELECT 1 FROM record_cases c JOIN case_decisions d ON d.case_id=c.id
       WHERE c.id=NEW.correction_case_id AND c.review_id=previous.id AND d.outcome='correction_allowed') THEN
     RAISE EXCEPTION 'Review replacement needs an approved correction';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_guard BEFORE INSERT ON transaction_reviews FOR EACH ROW EXECUTE FUNCTION node_review_guard();

-- Seal once, then retain the snapshot exactly as it was at recommendation time.
CREATE FUNCTION node_snapshot_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Preference/condition snapshots cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
   IF OLD.sealed_at IS NOT NULL OR NEW.sealed_at IS NULL OR
     (to_jsonb(NEW)-'sealed_at') IS DISTINCT FROM (to_jsonb(OLD)-'sealed_at') THEN
     RAISE EXCEPTION 'Snapshot can only be sealed once; create a new version';
   END IF;
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
CREATE TRIGGER preference_snapshot_guard BEFORE UPDATE OR DELETE ON worker_preference_versions FOR EACH ROW EXECUTE FUNCTION node_snapshot_guard();
CREATE TRIGGER condition_snapshot_guard BEFORE INSERT OR UPDATE OR DELETE ON hiring_condition_versions FOR EACH ROW EXECUTE FUNCTION node_snapshot_guard();
CREATE FUNCTION node_snapshot_child_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sealed timestamptz;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Snapshot children are append only'; END IF;
 IF TG_TABLE_NAME='hiring_condition_dates' THEN
   SELECT sealed_at INTO sealed FROM hiring_condition_versions WHERE id=NEW.condition_id FOR UPDATE;
 ELSE
   SELECT sealed_at INTO sealed FROM worker_preference_versions WHERE id=NEW.preference_id FOR UPDATE;
 END IF;
 IF sealed IS NOT NULL THEN RAISE EXCEPTION 'Sealed snapshot cannot receive new children'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preference_occupation_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_preference_occupations FOR EACH ROW EXECUTE FUNCTION node_snapshot_child_guard();
CREATE TRIGGER preference_region_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_preference_regions FOR EACH ROW EXECUTE FUNCTION node_snapshot_child_guard();
CREATE TRIGGER condition_dates_guard BEFORE INSERT OR UPDATE OR DELETE ON hiring_condition_dates FOR EACH ROW EXECUTE FUNCTION node_snapshot_child_guard();

CREATE FUNCTION node_recommendation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER impression_guard BEFORE INSERT ON recommendation_impressions FOR EACH ROW EXECUTE FUNCTION node_recommendation_guard();
CREATE TRIGGER outcome_guard BEFORE INSERT ON recommendation_outcomes FOR EACH ROW EXECUTE FUNCTION node_recommendation_guard();
CREATE FUNCTION node_permission_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.account_id IS NOT NULL AND NEW.account_id<>NEW.recorded_by) OR
    (NEW.organization_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM organization_memberships
     WHERE organization_id=NEW.organization_id AND account_id=NEW.recorded_by AND role='owner')) THEN
   RAISE EXCEPTION 'Learning permission requires subject/organization owner';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER permission_guard BEFORE INSERT ON learning_permission_events FOR EACH ROW EXECUTE FUNCTION node_permission_guard();

-- Capture only authoritative existing events. Never invent historical attendance,
-- actual receipt time, or consent from missing data.
CREATE FUNCTION node_capture_match_record() RETURNS trigger LANGUAGE plpgsql AS $$
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
   AND node_job_organization(mt.job_line_id)=node_job_organization(t.job_line_id)
   ORDER BY m.id DESC LIMIT 1;
   IF previous IS NOT NULL THEN
     INSERT INTO activity_records(match_id,kind,occurred_at,source,reporting_party,related_match_id,source_match_event_id)
     VALUES(NEW.match_id,'rehired',NEW.created_at,'system_event','system',previous,NEW.id);
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER capture_match_record AFTER INSERT ON match_events FOR EACH ROW EXECUTE FUNCTION node_capture_match_record();
CREATE FUNCTION node_capture_application_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF NEW.status IN ('applied','selected','rejected','withdrawn') THEN
   INSERT INTO recommendation_outcomes(worker_id,job_line_id,kind,actor_id,application_id,source,occurred_at)
   VALUES(NEW.worker_id,NEW.job_line_id,NEW.status,
     CASE WHEN NEW.status IN ('applied','withdrawn') THEN NEW.worker_id END,NEW.id,'server',clock_timestamp());
 END IF;
 RETURN NEW;
END $$;
-- Selection actor does not exist on the old applications table: preserve NULL,
-- never guess who selected/rejected. Future API should record authenticated actors.
CREATE TRIGGER capture_application_record AFTER INSERT OR UPDATE ON applications
 FOR EACH ROW WHEN(NEW.status IN ('applied','selected','rejected','withdrawn')) EXECUTE FUNCTION node_capture_application_record();

-- A new terms version becomes associated with a new pending match. Preserve the
-- change before negotiation; this is NOT an allegation against either party.
CREATE FUNCTION node_capture_condition_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t match_terms%ROWTYPE; previous bigint;
BEGIN
 SELECT * INTO STRICT t FROM match_terms WHERE id=NEW.terms_id;
 SELECT id INTO previous FROM match_terms WHERE job_line_id=t.job_line_id AND worker_id=t.worker_id
 AND version<t.version ORDER BY version DESC LIMIT 1;
 IF previous IS NOT NULL THEN
   INSERT INTO activity_records(match_id,kind,occurred_at,source,reporting_party,previous_terms_id)
   VALUES(NEW.id,'conditions_change',t.created_at,'server_snapshot','system',previous);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER capture_condition_change AFTER INSERT ON matches FOR EACH ROW EXECUTE FUNCTION node_capture_condition_change();

CREATE FUNCTION node_capture_due_date() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.due_date IS NOT DISTINCT FROM OLD.due_date THEN RETURN NEW; END IF;
 INSERT INTO payment_due_date_history(obligation_id,previous_due_date,due_date)
 VALUES(NEW.id,CASE WHEN TG_OP='UPDATE' THEN OLD.due_date END,NEW.due_date);
 RETURN NEW;
END $$;
CREATE TRIGGER capture_due_date AFTER INSERT OR UPDATE OF due_date ON payment_obligations
 FOR EACH ROW EXECUTE FUNCTION node_capture_due_date();

-- Backfill only exact authoritative lifecycle events, using their original times.
-- This does not infer historical attendance, payment receipt, consent or exposure.
INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,source_match_event_id)
 SELECT match_id,'match_'||event_type,created_at,'system_event',actor_id,'system',id
 FROM match_events WHERE event_type IN ('confirmed','cancelled','completed');
INSERT INTO recommendation_outcomes(worker_id,job_line_id,kind,match_id,actor_id,source,source_match_event_id,occurred_at)
 SELECT t.worker_id,t.job_line_id,CASE WHEN e.event_type='confirmed' THEN 'matched' ELSE 'cancelled' END,
 e.match_id,e.actor_id,'server',e.id,e.created_at
 FROM match_events e JOIN matches m ON m.id=e.match_id JOIN match_terms t ON t.id=m.terms_id
 WHERE e.event_type IN ('confirmed','cancelled');

CREATE VIEW current_learning_permissions AS
 SELECT DISTINCT ON (account_id,organization_id) account_id,organization_id,allowed,policy_version,created_at
 FROM learning_permission_events ORDER BY account_id,organization_id,id DESC;
CREATE VIEW effective_activity_records AS
 SELECT r.*, CASE
 WHEN EXISTS(SELECT 1 FROM activity_records n WHERE n.supersedes_id=r.id) THEN 'superseded'
 WHEN EXISTS(SELECT 1 FROM record_cases c WHERE c.activity_id=r.id AND NOT EXISTS(SELECT 1 FROM case_decisions cd WHERE cd.case_id=c.id)) THEN 'disputed'
 WHEN d.outcome='record_voided' THEN 'voided'
 WHEN d.outcome='correction_allowed' THEN 'correction_pending'
 WHEN d.outcome='record_upheld' OR EXISTS(SELECT 1 FROM activity_confirmations a WHERE a.activity_id=r.id) THEN 'confirmed'
 WHEN r.source IN ('system_event','server_snapshot') THEN 'system_recorded' ELSE 'reported' END AS evidence_state
 FROM activity_records r LEFT JOIN LATERAL (
   SELECT cd.outcome FROM record_cases c JOIN case_decisions cd ON cd.case_id=c.id
   WHERE c.activity_id=r.id ORDER BY cd.decided_at DESC,c.id DESC LIMIT 1
 ) d ON true;
CREATE VIEW effective_transaction_reviews AS
 SELECT r.*, CASE
 WHEN EXISTS(SELECT 1 FROM transaction_reviews n WHERE n.supersedes_id=r.id) THEN 'superseded'
 WHEN EXISTS(SELECT 1 FROM record_cases c WHERE c.review_id=r.id AND NOT EXISTS(SELECT 1 FROM case_decisions cd WHERE cd.case_id=c.id)) THEN 'disputed'
 WHEN d.outcome='record_voided' THEN 'voided'
 WHEN d.outcome='correction_allowed' THEN 'correction_pending'
 ELSE 'current' END AS review_state
 FROM transaction_reviews r LEFT JOIN LATERAL (
   SELECT cd.outcome FROM record_cases c JOIN case_decisions cd ON cd.case_id=c.id
   WHERE c.review_id=r.id ORDER BY cd.decided_at DESC,c.id DESC LIMIT 1
 ) d ON true;

-- Coverage is NOT trustworthiness. Zero history never becomes a zero/low score.
CREATE VIEW trust_evidence_coverage AS
 WITH subjects AS (
   SELECT 'worker'::text AS subject_type,id AS subject_id FROM accounts
   UNION ALL SELECT 'company',id FROM organizations
 ), eligible AS (
   SELECT r.id,r.match_id,r.occurred_at,t.worker_id,node_job_organization(t.job_line_id) AS organization_id
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

-- No training export, score or application GRANT is added. Access stays private.
REVOKE ALL ON activity_records,transaction_reviews,record_cases,case_decisions,activity_confirmations,payment_due_date_history,
 worker_preference_versions,worker_preference_occupations,worker_preference_regions,
 hiring_condition_versions,hiring_condition_dates,recommendation_impressions,recommendation_outcomes,
 learning_permission_events,current_learning_permissions,effective_activity_records,
 effective_transaction_reviews,trust_evidence_coverage FROM PUBLIC;
COMMIT;
