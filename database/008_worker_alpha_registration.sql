BEGIN;
-- Separate registration document: ability and ownership never share one array.
CREATE TABLE worker_alpha_registrations (
 account_id bigint PRIMARY KEY REFERENCES accounts(id),
 document jsonb NOT NULL CHECK(jsonb_typeof(document->'abilities')='array' AND jsonb_typeof(document->'ownedEquipment')='array'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON worker_alpha_registrations FROM PUBLIC;
COMMIT;
