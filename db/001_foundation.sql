-- NODE 0.1 foundation schema, PostgreSQL 16+
-- Initial relational core only. NOT the entire approved product.
-- Requires application-level identity verification, authorization, audit and PII controls.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('worker','company')),
  PRIMARY KEY (user_id,role)
);
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE company_members (
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid NOT NULL REFERENCES users(id),
  member_status text NOT NULL DEFAULT 'invited' CHECK (member_status IN ('invited','active','inactive')),
  PRIMARY KEY(company_id,user_id)
);
CREATE TABLE occupations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ko text NOT NULL,
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE worker_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE worker_skills (
  worker_id uuid NOT NULL REFERENCES worker_profiles(user_id),
  occupation_id uuid NOT NULL REFERENCES occupations(id),
  experience_months integer CHECK(experience_months >= 0),
  PRIMARY KEY(worker_id,occupation_id)
);
CREATE TABLE jobsites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE job_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jobsite_id uuid NOT NULL REFERENCES jobsites(id),
  occupation_id uuid NOT NULL REFERENCES occupations(id),
  visibility text NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','selected','direct')),
  partial_dates_allowed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('draft','open','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE job_position_dates (
  position_id uuid NOT NULL REFERENCES job_positions(id),
  work_date date NOT NULL,
  capacity integer NOT NULL CHECK(capacity >= 0),
  PRIMARY KEY(position_id,work_date)
);
CREATE TABLE job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL REFERENCES job_positions(id),
  worker_id uuid NOT NULL REFERENCES worker_profiles(user_id),
  status text NOT NULL DEFAULT 'applied' CHECK(status IN ('applied','reviewing','selected','waitlisted','rejected','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE job_application_dates (
  application_id uuid NOT NULL REFERENCES job_applications(id),
  work_date date NOT NULL,
  PRIMARY KEY(application_id,work_date)
);
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL REFERENCES job_positions(id),
  worker_id uuid NOT NULL REFERENCES worker_profiles(user_id),
  status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','confirmed','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE match_dates (
  match_id uuid NOT NULL REFERENCES matches(id),
  work_date date NOT NULL,
  PRIMARY KEY(match_id,work_date)
);
CREATE TABLE match_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id),
  version integer NOT NULL CHECK(version > 0),
  terms_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id,version)
);
CREATE TABLE match_approvals (
  match_terms_id uuid NOT NULL REFERENCES match_terms(id),
  party_role text NOT NULL CHECK(party_role IN ('worker','company')),
  approved_by uuid NOT NULL REFERENCES users(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(match_terms_id,party_role)
);
CREATE TABLE equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type text NOT NULL,
  registration_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX equipment_registration_unique ON equipment(registration_number) WHERE registration_number IS NOT NULL;
CREATE TABLE equipment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  kind text NOT NULL CHECK(kind IN ('work','maintenance','unavailable')),
  CHECK(ends_at > starts_at)
);
CREATE TABLE transport_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  vehicle_label text NOT NULL,
  max_payload_kg numeric CHECK(max_payload_kg > 0)
);
CREATE TABLE transport_vehicle_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES transport_vehicles(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  kind text NOT NULL CHECK(kind IN ('reserved','driving','maintenance','unavailable')),
  CHECK(ends_at > starts_at)
);
CREATE TABLE payment_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK(source_type IN ('work','equipment','transport')),
  source_id uuid NOT NULL,
  payer_company_id uuid REFERENCES companies(id),
  payer_user_id uuid REFERENCES users(id),
  amount_krw bigint NOT NULL CHECK(amount_krw >= 0),
  due_on date,
  CHECK((payer_company_id IS NOT NULL) <> (payer_user_id IS NOT NULL))
);
CREATE TABLE payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id uuid NOT NULL REFERENCES payment_obligations(id),
  amount_krw bigint NOT NULL CHECK(amount_krw > 0),
  reported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_confirmations (
  payment_record_id uuid PRIMARY KEY REFERENCES payment_records(id),
  confirmed_by uuid NOT NULL REFERENCES users(id),
  confirmed_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
