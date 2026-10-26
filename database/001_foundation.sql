-- NODE DB-BASE-01 / PostgreSQL 16+. Run on an empty database.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE accounts(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE organizations(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,name text NOT NULL CHECK(length(trim(name))>0),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE account_roles(account_id bigint NOT NULL REFERENCES accounts(id),role text NOT NULL CHECK(role IN ('worker','company','transporter','admin')),PRIMARY KEY(account_id,role));
CREATE TABLE organization_memberships(organization_id bigint NOT NULL REFERENCES organizations(id),account_id bigint NOT NULL REFERENCES accounts(id),role text NOT NULL CHECK(role IN ('owner','manager','staff')),PRIMARY KEY(organization_id,account_id));
CREATE TABLE occupation_categories(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,name text NOT NULL UNIQUE);
CREATE TABLE occupations(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,category_id bigint NOT NULL REFERENCES occupation_categories(id),name text NOT NULL,UNIQUE(category_id,name));
CREATE TABLE regions(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,parent_id bigint REFERENCES regions(id),name text NOT NULL,code text UNIQUE);
CREATE TABLE worker_profiles(account_id bigint PRIMARY KEY REFERENCES accounts(id),experience_months int NOT NULL DEFAULT 0 CHECK(experience_months>=0));
CREATE TABLE worker_regions(account_id bigint NOT NULL REFERENCES worker_profiles(account_id),region_id bigint NOT NULL REFERENCES regions(id),include_descendants boolean NOT NULL DEFAULT false,PRIMARY KEY(account_id,region_id));
CREATE TABLE worksites(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,organization_id bigint NOT NULL REFERENCES organizations(id),region_id bigint REFERENCES regions(id),name text NOT NULL);
CREATE TABLE equipment(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,owner_account_id bigint REFERENCES accounts(id),owner_organization_id bigint REFERENCES organizations(id),kind text NOT NULL,grade text,model text,serial_ref text UNIQUE,CHECK(num_nonnulls(owner_account_id,owner_organization_id)=1));
CREATE TABLE equipment_options(equipment_id bigint NOT NULL REFERENCES equipment(id),option_code text NOT NULL,availability text NOT NULL CHECK(availability IN ('installed','available','unavailable')),PRIMARY KEY(equipment_id,option_code));
CREATE TABLE job_posts(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,worksite_id bigint NOT NULL REFERENCES worksites(id),visibility text NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','targeted','private')),status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed','cancelled')),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE job_lines(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,job_post_id bigint NOT NULL REFERENCES job_posts(id),occupation_id bigint NOT NULL REFERENCES occupations(id),resource_mode text NOT NULL CHECK(resource_mode IN ('worker','equipment_and_worker','equipment')),daily_pay_krw bigint NOT NULL CHECK(daily_pay_krw>=0),allow_partial boolean NOT NULL DEFAULT false);
CREATE TABLE job_line_dates(job_line_id bigint NOT NULL REFERENCES job_lines(id),work_date date NOT NULL,capacity int NOT NULL CHECK(capacity>0),PRIMARY KEY(job_line_id,work_date));
CREATE TABLE applications(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,job_line_id bigint NOT NULL REFERENCES job_lines(id),worker_id bigint NOT NULL REFERENCES accounts(id),status text NOT NULL DEFAULT 'applied' CHECK(status IN ('applied','waitlisted','selected','rejected','withdrawn')),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE match_terms(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,job_line_id bigint NOT NULL REFERENCES job_lines(id),worker_id bigint NOT NULL REFERENCES accounts(id),equipment_id bigint REFERENCES equipment(id),version int NOT NULL CHECK(version>0),terms jsonb NOT NULL,terms_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(job_line_id,worker_id,version),UNIQUE(id,terms_hash));
CREATE TABLE match_dates(terms_id bigint NOT NULL REFERENCES match_terms(id),work_date date NOT NULL,PRIMARY KEY(terms_id,work_date));
CREATE TABLE match_approvals(terms_id bigint NOT NULL REFERENCES match_terms(id),party text NOT NULL CHECK(party IN ('worker','company')),approved_by bigint NOT NULL REFERENCES accounts(id),approved_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(terms_id,party));
CREATE TABLE matches(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,terms_id bigint NOT NULL UNIQUE REFERENCES match_terms(id),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE calendar_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,account_id bigint REFERENCES accounts(id),equipment_id bigint REFERENCES equipment(id),period tstzrange NOT NULL,type text NOT NULL CHECK(type IN ('personal','external_work','leave','maintenance','unavailable')),CHECK(num_nonnulls(account_id,equipment_id)=1),CHECK(NOT isempty(period)));
CREATE TABLE resource_reservations(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,match_id bigint REFERENCES matches(id),account_id bigint REFERENCES accounts(id),equipment_id bigint REFERENCES equipment(id),period tstzrange NOT NULL,status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','released')),CHECK(num_nonnulls(account_id,equipment_id)=1),CHECK(NOT isempty(period)));
ALTER TABLE resource_reservations ADD CONSTRAINT no_worker_overlap EXCLUDE USING gist(account_id WITH =,period WITH &&) WHERE(account_id IS NOT NULL AND status='confirmed');
ALTER TABLE resource_reservations ADD CONSTRAINT no_equipment_overlap EXCLUDE USING gist(equipment_id WITH =,period WITH &&) WHERE(equipment_id IS NOT NULL AND status='confirmed');
CREATE TABLE completion_confirmations(match_id bigint NOT NULL REFERENCES matches(id),party text NOT NULL CHECK(party IN ('worker','company')),confirmed_by bigint NOT NULL REFERENCES accounts(id),confirmed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(match_id,party));
CREATE TABLE transport_vehicles(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,owner_organization_id bigint REFERENCES organizations(id),payload_kg int NOT NULL CHECK(payload_kg>0),description text);
CREATE TABLE transport_requests(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,equipment_id bigint NOT NULL REFERENCES equipment(id),requested_by bigint NOT NULL REFERENCES accounts(id),payer_organization_id bigint REFERENCES organizations(id),origin text NOT NULL,destination text NOT NULL,requested_at timestamptz NOT NULL,status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','accepted','in_transit','delivered','cancelled')));
CREATE TABLE transport_assignments(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,request_id bigint NOT NULL UNIQUE REFERENCES transport_requests(id),vehicle_id bigint NOT NULL REFERENCES transport_vehicles(id),carrier_account_id bigint NOT NULL REFERENCES accounts(id),period tstzrange NOT NULL,status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','released')),CHECK(NOT isempty(period)));
ALTER TABLE transport_assignments ADD CONSTRAINT no_vehicle_overlap EXCLUDE USING gist(vehicle_id WITH =,period WITH &&) WHERE(status='confirmed');
CREATE TABLE transport_handoffs(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,request_id bigint NOT NULL REFERENCES transport_requests(id),event text NOT NULL CHECK(event IN ('handover','receipt')),confirmed_by bigint NOT NULL REFERENCES accounts(id),confirmed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE payment_obligations(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,match_id bigint REFERENCES matches(id),transport_request_id bigint REFERENCES transport_requests(id),amount_krw bigint NOT NULL CHECK(amount_krw>=0),due_date date,payer_organization_id bigint REFERENCES organizations(id),CHECK(num_nonnulls(match_id,transport_request_id)=1));
CREATE TABLE payment_claims(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,obligation_id bigint NOT NULL REFERENCES payment_obligations(id),amount_krw bigint NOT NULL CHECK(amount_krw>0),paid_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE receipt_confirmations(claim_id bigint PRIMARY KEY REFERENCES payment_claims(id),confirmed_by bigint NOT NULL REFERENCES accounts(id),confirmed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id bigint REFERENCES accounts(id),entity_type text NOT NULL,entity_id bigint NOT NULL,action text NOT NULL,payload jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now());
-- Confirmations are guarded against stale terms, incomplete approvals, and capacity races.
CREATE OR REPLACE FUNCTION require_match_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_line_id bigint; v_worker_id bigint; ver int; max_ver int; requested_dates int; booked int; capacity_limit int; d date;
BEGIN
 IF NEW.status!='confirmed' OR OLD.status='confirmed' THEN RETURN NEW; END IF;
 SELECT job_line_id,worker_id,version INTO v_line_id,v_worker_id,ver FROM match_terms WHERE id=NEW.terms_id;
 SELECT max(version) INTO max_ver FROM match_terms WHERE job_line_id=v_line_id AND worker_id=v_worker_id;
 IF ver<>max_ver THEN RAISE EXCEPTION 'Outdated terms version'; END IF;
 IF (SELECT count(*) FROM match_approvals WHERE terms_id=NEW.terms_id)!=2 THEN
   RAISE EXCEPTION 'Both parties must approve the same terms version';
 END IF;
 SELECT count(*) INTO requested_dates FROM match_dates WHERE terms_id=NEW.terms_id;
 IF requested_dates=0 THEN RAISE EXCEPTION 'At least one work date required'; END IF;
 -- Lock the line to serialize competing confirmations across dates.
 PERFORM 1 FROM job_lines WHERE id=v_line_id FOR UPDATE;
 FOR d IN SELECT work_date FROM match_dates WHERE terms_id=NEW.terms_id ORDER BY work_date LOOP
   SELECT capacity INTO capacity_limit FROM job_line_dates WHERE job_line_id=v_line_id AND work_date=d;
   IF capacity_limit IS NULL THEN RAISE EXCEPTION 'Date not offered: %',d; END IF;
   SELECT count(*) INTO booked FROM matches m
     JOIN match_terms t ON t.id=m.terms_id
     JOIN match_dates md ON md.terms_id=t.id
     WHERE t.job_line_id=v_line_id AND md.work_date=d AND m.status='confirmed' AND m.id<>NEW.id;
   IF booked>=capacity_limit THEN RAISE EXCEPTION 'Job capacity exceeded for %',d; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER check_match_confirmation BEFORE UPDATE OF status ON matches
FOR EACH ROW EXECUTE FUNCTION require_match_confirmation();
-- Once a match is confirmed, approved terms and dates are immutable.
CREATE OR REPLACE FUNCTION protect_confirmed_terms() RETURNS trigger LANGUAGE plpgsql AS $
DECLARE target_id bigint;
BEGIN
 target_id := CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;
 IF EXISTS (SELECT 1 FROM matches WHERE terms_id=target_id AND status IN ('confirmed','completed')) THEN
   RAISE EXCEPTION 'Confirmed terms are immutable';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $;
CREATE TRIGGER protect_terms BEFORE UPDATE OR DELETE ON match_terms
FOR EACH ROW EXECUTE FUNCTION protect_confirmed_terms();

CREATE OR REPLACE FUNCTION protect_confirmed_children() RETURNS trigger LANGUAGE plpgsql AS $
DECLARE target_id bigint;
BEGIN
 target_id := CASE WHEN TG_OP='DELETE' THEN OLD.terms_id ELSE NEW.terms_id END;
 IF EXISTS (SELECT 1 FROM matches WHERE terms_id=target_id AND status IN ('confirmed','completed')) THEN
   RAISE EXCEPTION 'Confirmed match details are immutable';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $;
CREATE TRIGGER protect_dates BEFORE INSERT OR UPDATE OR DELETE ON match_dates
FOR EACH ROW EXECUTE FUNCTION protect_confirmed_children();
CREATE TRIGGER protect_approvals BEFORE INSERT OR UPDATE OR DELETE ON match_approvals
FOR EACH ROW EXECUTE FUNCTION protect_confirmed_children();
COMMIT;
