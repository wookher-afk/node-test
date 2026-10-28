-- Internal registration/read foundation. Additive, apply once after 006.
BEGIN;
SELECT pg_advisory_xact_lock(710031,1);
LOCK TABLE job_posts,job_lines,job_line_dates,worksites IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE job_posts ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
 ADD COLUMN created_by bigint REFERENCES accounts(id),
 ADD COLUMN updated_by bigint REFERENCES accounts(id),
 ADD COLUMN updated_at timestamptz;
CREATE INDEX job_posts_worksite_idx ON job_posts(worksite_id,id);
CREATE INDEX job_lines_post_idx ON job_lines(job_post_id,id);

-- No backfill: current fields cannot reconstruct an old promise or its author.
CREATE TABLE job_post_versions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 job_post_id bigint NOT NULL REFERENCES job_posts(id),
 version integer NOT NULL CHECK(version>0),
 organization_id bigint NOT NULL REFERENCES organizations(id),
 worksite_id bigint NOT NULL REFERENCES worksites(id),
 worksite_snapshot jsonb NOT NULL CHECK(jsonb_typeof(worksite_snapshot)='object'),
 visibility text NOT NULL CHECK(visibility IN ('public','targeted','private')),
 recorded_by bigint NOT NULL REFERENCES accounts(id),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 sealed_at timestamptz,
 UNIQUE(job_post_id,version)
);
CREATE TABLE job_post_version_lines (
 post_version_id bigint NOT NULL REFERENCES job_post_versions(id),
 job_line_id bigint NOT NULL REFERENCES job_lines(id),
 occupation_id bigint NOT NULL REFERENCES occupations(id),
 resource_mode text NOT NULL CHECK(resource_mode IN ('worker','equipment_and_worker','equipment')),
 allow_partial boolean NOT NULL,
 pay_unit text NOT NULL CHECK(length(pay_unit) BETWEEN 1 AND 32),
 amount_krw bigint NOT NULL CHECK(amount_krw>=0),
 payment_mode text NOT NULL CHECK(payment_mode IN ('same_day','next_day','date')),
 specified_due_date date,
 CHECK((payment_mode='date')=(specified_due_date IS NOT NULL)),
 PRIMARY KEY(post_version_id,job_line_id)
);
CREATE TABLE job_post_version_dates (
 post_version_id bigint NOT NULL,
 job_line_id bigint NOT NULL,
 work_date date NOT NULL,
 capacity integer NOT NULL CHECK(capacity>0),
 payment_due_date date NOT NULL,
 PRIMARY KEY(post_version_id,job_line_id,work_date),
 FOREIGN KEY(post_version_id,job_line_id) REFERENCES job_post_version_lines(post_version_id,job_line_id)
);
CREATE TABLE job_post_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 job_post_id bigint NOT NULL REFERENCES job_posts(id),
 actor_id bigint REFERENCES accounts(id),
 event_type text NOT NULL CHECK(event_type IN ('created','updated','version_sealed')),
 post_version_id bigint REFERENCES job_post_versions(id),
 before_data jsonb,
 after_data jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX job_post_events_post_idx ON job_post_events(job_post_id,id);
CREATE TRIGGER immutable_job_post_events BEFORE UPDATE OR DELETE ON job_post_events
 FOR EACH ROW EXECUTE FUNCTION node_record_immutable();

CREATE FUNCTION node_job_post_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p job_posts%ROWTYPE; s worksites%ROWTYPE; expected_site jsonb;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Job post versions are immutable'; END IF;
 SELECT * INTO STRICT p FROM job_posts WHERE id=NEW.job_post_id;
 SELECT * INTO STRICT s FROM worksites WHERE id=p.worksite_id;
 IF NOT EXISTS(SELECT 1 FROM organization_memberships WHERE organization_id=s.organization_id
  AND account_id=NEW.recorded_by AND role IN ('owner','manager')) THEN
  RAISE EXCEPTION 'Job post version requires a current organization manager';
 END IF;
 expected_site:=jsonb_build_object('id',s.id::text,'organization_id',s.organization_id::text,
  'region_id',s.region_id::text,'name',s.name,'address',s.address,'location_notes',s.location_notes,
  'description',s.description,'version',s.version,'is_active',s.is_active);
 IF TG_OP='INSERT' THEN
  IF NEW.sealed_at IS NOT NULL OR NEW.version<>p.version OR NEW.worksite_id<>s.id
   OR NEW.organization_id<>s.organization_id OR NEW.visibility<>p.visibility
   OR NEW.worksite_snapshot IS DISTINCT FROM expected_site THEN
   RAISE EXCEPTION 'Job post version must capture current fields and start unsealed';
  END IF;
  NEW.recorded_at:=clock_timestamp();
 ELSE
  IF OLD.sealed_at IS NOT NULL OR NEW.sealed_at IS NULL OR
   (to_jsonb(NEW)-'sealed_at') IS DISTINCT FROM (to_jsonb(OLD)-'sealed_at') THEN
   RAISE EXCEPTION 'Job post version can only be sealed once';
  END IF;
  IF NEW.version<>p.version OR NEW.worksite_id<>s.id OR NEW.organization_id<>s.organization_id
   OR NEW.visibility<>p.visibility OR NEW.worksite_snapshot IS DISTINCT FROM expected_site THEN
   RAISE EXCEPTION 'Job post fields changed before sealing';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM job_post_version_lines WHERE post_version_id=NEW.id)
   OR EXISTS(SELECT 1 FROM job_lines l FULL JOIN job_post_version_lines v
    ON v.job_line_id=l.id AND v.post_version_id=NEW.id
    WHERE (l.job_post_id=p.id OR v.post_version_id=NEW.id) AND
     (l.id IS NULL OR v.job_line_id IS NULL OR l.job_post_id<>p.id OR v.pay_unit<>'day'
      OR (l.occupation_id,l.resource_mode,l.allow_partial,l.daily_pay_krw)
       IS DISTINCT FROM (v.occupation_id,v.resource_mode,v.allow_partial,v.amount_krw))) THEN
   RAISE EXCEPTION 'Job post version must contain every current recruitment line';
  END IF;
  IF EXISTS(SELECT 1 FROM job_post_version_lines l WHERE l.post_version_id=NEW.id AND NOT EXISTS(
    SELECT 1 FROM job_post_version_dates d WHERE d.post_version_id=NEW.id AND d.job_line_id=l.job_line_id))
   OR EXISTS(SELECT 1 FROM job_line_dates d JOIN job_lines l ON l.id=d.job_line_id
    FULL JOIN job_post_version_dates v ON v.job_line_id=d.job_line_id AND v.work_date=d.work_date AND v.post_version_id=NEW.id
    WHERE (l.job_post_id=p.id OR v.post_version_id=NEW.id) AND
     (d.job_line_id IS NULL OR v.job_line_id IS NULL OR l.job_post_id<>p.id OR d.capacity<>v.capacity))
   OR EXISTS(SELECT 1 FROM job_post_version_dates d JOIN job_post_version_lines l
    USING(post_version_id,job_line_id) WHERE d.post_version_id=NEW.id AND d.payment_due_date<>
     CASE l.payment_mode WHEN 'same_day' THEN d.work_date WHEN 'next_day' THEN d.work_date+1 ELSE l.specified_due_date END) THEN
   RAISE EXCEPTION 'Job post version dates, capacities and payment promises must match';
  END IF;
  NEW.sealed_at:=clock_timestamp();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER job_post_version_guard BEFORE INSERT OR UPDATE OR DELETE ON job_post_versions
 FOR EACH ROW EXECUTE FUNCTION node_job_post_version_guard();
CREATE FUNCTION node_job_post_version_child_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Job post version children are append only'; END IF;
 IF (SELECT sealed_at FROM job_post_versions WHERE id=NEW.post_version_id FOR UPDATE) IS NOT NULL THEN
  RAISE EXCEPTION 'Sealed job post version cannot receive children';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER job_post_version_line_guard BEFORE INSERT OR UPDATE OR DELETE ON job_post_version_lines
 FOR EACH ROW EXECUTE FUNCTION node_job_post_version_child_guard();
CREATE TRIGGER job_post_version_date_guard BEFORE INSERT OR UPDATE OR DELETE ON job_post_version_dates
 FOR EACH ROW EXECUTE FUNCTION node_job_post_version_child_guard();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['job_post_versions','job_post_version_lines','job_post_version_dates'] LOOP
  EXECUTE format('CREATE TRIGGER job_post_version_write_lock BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION node_record_write_lock()',t);
 END LOOP;
END $$;
CREATE FUNCTION node_job_post_version_complete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT sealed_at FROM job_post_versions WHERE id=NEW.id) IS NULL THEN
  RAISE EXCEPTION 'Job post version must be sealed before commit';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER job_post_version_complete AFTER INSERT ON job_post_versions
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION node_job_post_version_complete();
CREATE FUNCTION node_job_post_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE actor bigint:=nullif(current_setting('node.worksite_actor',true),'')::bigint;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Job post history cannot be deleted'; END IF;
 IF TG_TABLE_NAME='job_posts' THEN
  INSERT INTO public.job_post_events(job_post_id,actor_id,event_type,before_data,after_data)
  VALUES(NEW.id,actor,CASE WHEN TG_OP='INSERT' THEN 'created' ELSE 'updated' END,
   CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END,to_jsonb(NEW));
 ELSIF NEW.sealed_at IS NOT NULL THEN
  INSERT INTO public.job_post_events(job_post_id,actor_id,event_type,post_version_id,after_data)
  VALUES(NEW.job_post_id,NEW.recorded_by,'version_sealed',NEW.id,to_jsonb(NEW));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER job_post_delete_guard BEFORE DELETE ON job_posts FOR EACH ROW EXECUTE FUNCTION node_job_post_audit();
CREATE TRIGGER job_post_audit AFTER INSERT OR UPDATE ON job_posts FOR EACH ROW EXECUTE FUNCTION node_job_post_audit();
CREATE TRIGGER job_post_version_audit AFTER UPDATE ON job_post_versions FOR EACH ROW EXECUTE FUNCTION node_job_post_audit();
REVOKE ALL ON job_post_versions,job_post_version_lines,job_post_version_dates,job_post_events FROM PUBLIC;
REVOKE ALL ON FUNCTION node_job_post_version_guard(),node_job_post_version_child_guard(),node_job_post_version_complete(),node_job_post_audit() FROM PUBLIC;
COMMIT;
