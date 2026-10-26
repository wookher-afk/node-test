-- NODE account authentication and worker/company onboarding.
BEGIN;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS display_name text;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique ON accounts(lower(email)) WHERE email IS NOT NULL;
CREATE TABLE IF NOT EXISTS account_sessions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
