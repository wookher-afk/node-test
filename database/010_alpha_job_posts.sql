-- Additive extension of existing posts and immutable condition versions.
-- Apply once after 009, only under a separate deployment approval.
BEGIN;
SELECT pg_advisory_xact_lock(710031,1);
ALTER TABLE job_posts
 ADD COLUMN alpha_organization_id bigint REFERENCES organizations(id),
 ADD COLUMN alpha_registration_version integer,
 ADD COLUMN alpha_request_hash text,
 ADD CONSTRAINT alpha_post_source_complete CHECK (
  (alpha_organization_id IS NULL AND alpha_registration_version IS NULL AND alpha_request_hash IS NULL) OR
  (num_nonnulls(alpha_organization_id,alpha_registration_version,alpha_request_hash)=3 AND alpha_registration_version>0 AND alpha_request_hash ~ '^[0-9a-f]{64}$')),
 ADD CONSTRAINT alpha_post_source_once UNIQUE(alpha_organization_id,alpha_registration_version);
ALTER TABLE job_lines ADD COLUMN alpha_conditions jsonb
 CHECK(alpha_conditions IS NULL OR jsonb_typeof(alpha_conditions)='object');
ALTER TABLE job_post_version_lines ADD COLUMN alpha_conditions jsonb
 CHECK(alpha_conditions IS NULL OR jsonb_typeof(alpha_conditions)='object');
ALTER TABLE job_post_versions ADD COLUMN alpha_source jsonb
 CHECK(alpha_source IS NULL OR jsonb_typeof(alpha_source)='object');
-- Existing version-child guard already forbids updates/deletes and sealed inserts.
-- Check extended conditions too when the existing version is sealed.
CREATE FUNCTION node_alpha_post_seal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.sealed_at IS NOT NULL AND OLD.sealed_at IS NULL THEN
  IF EXISTS(SELECT 1 FROM job_lines l JOIN job_post_version_lines v ON v.job_line_id=l.id
   WHERE v.post_version_id=NEW.id AND l.alpha_conditions IS DISTINCT FROM v.alpha_conditions) THEN
   RAISE EXCEPTION 'Alpha conditions must match their immutable version';
  END IF;
  IF EXISTS(SELECT 1 FROM job_posts p WHERE p.id=NEW.job_post_id AND p.alpha_organization_id IS NOT NULL) THEN
   IF NEW.alpha_source IS NULL OR NOT EXISTS(
    SELECT 1 FROM job_posts p WHERE p.id=NEW.job_post_id
     AND p.alpha_organization_id=NEW.organization_id
     AND p.alpha_registration_version=(NEW.alpha_source->>'registration_version')::integer
     AND p.alpha_request_hash=NEW.alpha_source->>'request_hash') THEN
    RAISE EXCEPTION 'Alpha source must match its organization and version';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER alpha_post_seal_guard BEFORE UPDATE ON job_post_versions
 FOR EACH ROW EXECUTE FUNCTION node_alpha_post_seal_guard();
REVOKE ALL ON FUNCTION node_alpha_post_seal_guard() FROM PUBLIC;
COMMIT;
