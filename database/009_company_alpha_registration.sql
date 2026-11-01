BEGIN;
-- Additive Alpha snapshot. Existing organizations, worksites and versioned job
-- posts remain intact. No inferred occupation FK or duplicated catalog.
CREATE TABLE company_alpha_registrations (
 organization_id bigint PRIMARY KEY REFERENCES organizations(id),
 document jsonb NOT NULL CHECK(jsonb_typeof(document->'lines')='array'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON company_alpha_registrations FROM PUBLIC;
COMMIT;
