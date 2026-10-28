-- Additive worksite management. Apply once, after 005, on an approved copy first.
BEGIN;
SELECT pg_advisory_xact_lock(710031,1);
LOCK TABLE worksites, organization_memberships IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE worksites
 ADD COLUMN address text CHECK(address IS NULL OR length(btrim(address)) BETWEEN 1 AND 500),
 ADD COLUMN location_notes text CHECK(length(location_notes)<=1000),
 ADD COLUMN description text CHECK(length(description)<=3000),
 ADD COLUMN is_active boolean NOT NULL DEFAULT true,
 ADD COLUMN created_by bigint REFERENCES accounts(id),
 ADD COLUMN created_at timestamptz,
 ADD COLUMN updated_by bigint REFERENCES accounts(id),
 ADD COLUMN updated_at timestamptz,
 ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
-- Historical addresses, authors and times remain NULL, never fabricated.
CREATE INDEX worksites_organization_idx ON worksites(organization_id,id);
CREATE TABLE worksite_assignments (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 worksite_id bigint NOT NULL REFERENCES worksites(id),
 organization_id bigint NOT NULL REFERENCES organizations(id),
 account_id bigint NOT NULL REFERENCES accounts(id),
 can_view boolean NOT NULL DEFAULT true,
 can_edit boolean NOT NULL DEFAULT false,
 can_deactivate boolean NOT NULL DEFAULT false,
 can_confirm_work boolean NOT NULL DEFAULT false,
 active boolean NOT NULL DEFAULT true,
 created_by bigint REFERENCES accounts(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_by bigint REFERENCES accounts(id),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(worksite_id,account_id),
 CHECK(can_view OR NOT(can_edit OR can_deactivate OR can_confirm_work))
);
CREATE INDEX worksite_assignments_account_idx ON worksite_assignments(account_id,worksite_id) WHERE active;
CREATE TABLE worksite_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 worksite_id bigint NOT NULL REFERENCES worksites(id),
 actor_id bigint REFERENCES accounts(id),
 event_type text NOT NULL CHECK(event_type IN ('created','updated','deactivated','assignment_granted','assignment_changed','assignment_revoked','membership_removed','organization_changed')),
 before_data jsonb,
 after_data jsonb,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX worksite_events_site_idx ON worksite_events(worksite_id,id);
CREATE TRIGGER immutable_worksite_events BEFORE UPDATE OR DELETE ON worksite_events
 FOR EACH ROW EXECUTE FUNCTION node_record_immutable();

-- Reuse the existing matching/membership lock to serialize permission revocation
-- with worksite changes. Server transactions acquire it before checking access.
CREATE TRIGGER worksite_assignment_write_lock BEFORE INSERT OR UPDATE OR DELETE ON worksite_assignments
 FOR EACH STATEMENT EXECUTE FUNCTION node_record_write_lock();
CREATE FUNCTION node_worksite_assignment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Revoke assignments instead of deleting history'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id,NEW.worksite_id,NEW.account_id) IS DISTINCT FROM (OLD.id,OLD.worksite_id,OLD.account_id) THEN
  RAISE EXCEPTION 'Assignment identity is immutable';
 END IF;
 IF NEW.active AND NOT EXISTS(
  SELECT 1 FROM worksites s JOIN organization_memberships m ON m.organization_id=s.organization_id
  WHERE s.id=NEW.worksite_id AND s.organization_id=NEW.organization_id AND m.account_id=NEW.account_id) THEN
  RAISE EXCEPTION 'Assignment requires current membership in the worksite organization';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER worksite_assignment_guard BEFORE INSERT OR UPDATE OR DELETE ON worksite_assignments
 FOR EACH ROW EXECUTE FUNCTION node_worksite_assignment_guard();

-- Only this narrowly scoped trigger writes audit history. Runtime roles never
-- receive direct INSERT/UPDATE/DELETE grants on worksite_events.
CREATE FUNCTION node_worksite_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE actor bigint := nullif(current_setting('node.worksite_actor',true),'')::bigint;
 event text; site_id bigint;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Deactivate worksites instead of deleting history'; END IF;
 IF TG_TABLE_NAME='worksites' THEN
  site_id:=NEW.id;
  IF TG_OP='INSERT' THEN event:='created';
  ELSIF OLD.is_active AND NOT NEW.is_active THEN event:='deactivated';
  ELSIF OLD.organization_id<>NEW.organization_id THEN event:='organization_changed';
  ELSE event:='updated'; END IF;
 ELSE
  site_id:=NEW.worksite_id;
  IF TG_OP='INSERT' OR (NOT OLD.active AND NEW.active) THEN event:='assignment_granted';
  ELSIF OLD.active AND NOT NEW.active THEN event:=coalesce(nullif(current_setting('node.worksite_reason',true),''),'assignment_revoked');
  ELSE event:='assignment_changed'; END IF;
 END IF;
 INSERT INTO public.worksite_events(worksite_id,actor_id,event_type,before_data,after_data)
 VALUES(site_id,actor,event,
  CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END,to_jsonb(NEW));
 RETURN NEW;
END $$;
CREATE TRIGGER worksite_delete_guard BEFORE DELETE ON worksites FOR EACH ROW EXECUTE FUNCTION node_worksite_audit();
CREATE TRIGGER worksite_audit AFTER INSERT OR UPDATE ON worksites FOR EACH ROW EXECUTE FUNCTION node_worksite_audit();
CREATE TRIGGER worksite_assignment_audit AFTER INSERT OR UPDATE ON worksite_assignments FOR EACH ROW EXECUTE FUNCTION node_worksite_audit();

-- Removal ends grants permanently, even if that account later rejoins. Historical
-- membership/assignment events remain; a new explicit grant is needed on rejoin.
CREATE FUNCTION node_revoke_worksite_assignments() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE prior_reason text := current_setting('node.worksite_reason',true);
BEGIN
 IF TG_TABLE_NAME='organization_memberships' THEN
  IF TG_OP='UPDATE' AND (NEW.organization_id,NEW.account_id) IS NOT DISTINCT FROM (OLD.organization_id,OLD.account_id) THEN RETURN NEW; END IF;
  PERFORM set_config('node.worksite_reason','membership_removed',true);
  UPDATE public.worksite_assignments SET active=false,updated_by=NULL,updated_at=clock_timestamp()
   WHERE organization_id=OLD.organization_id AND account_id=OLD.account_id AND active;
 ELSE
  IF NEW.organization_id=OLD.organization_id THEN RETURN NEW; END IF;
  PERFORM set_config('node.worksite_reason','assignment_revoked',true);
  UPDATE public.worksite_assignments SET active=false,updated_by=NULL,updated_at=clock_timestamp()
   WHERE worksite_id=OLD.id AND active;
 END IF;
 PERFORM set_config('node.worksite_reason',coalesce(prior_reason,''),true);
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER membership_worksite_revocation AFTER DELETE OR UPDATE ON organization_memberships
 FOR EACH ROW EXECUTE FUNCTION node_revoke_worksite_assignments();
CREATE TRIGGER worksite_organization_revocation AFTER UPDATE OF organization_id ON worksites
 FOR EACH ROW EXECUTE FUNCTION node_revoke_worksite_assignments();
REVOKE ALL ON worksite_assignments,worksite_events FROM PUBLIC;
REVOKE ALL ON FUNCTION node_worksite_assignment_guard(),node_worksite_audit(),node_revoke_worksite_assignments() FROM PUBLIC;
COMMIT;
