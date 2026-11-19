CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE bed_status AS ENUM ('available','occupied','reserved','cleaning','maintenance');
CREATE TABLE departments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(120) NOT NULL,
 code varchar(20) NOT NULL UNIQUE
);
CREATE TABLE rooms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 department_id uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
 name varchar(80) NOT NULL,
 UNIQUE(department_id,name)
);
CREATE TABLE beds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
 label varchar(50) NOT NULL,
 status bed_status NOT NULL DEFAULT 'available',
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(room_id,label)
);
CREATE INDEX idx_beds_status ON beds(status);
CREATE TABLE bed_status_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 bed_id uuid NOT NULL REFERENCES beds(id) ON DELETE RESTRICT,
 old_status bed_status NOT NULL,
 new_status bed_status NOT NULL,
 reason varchar(500) NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
-- Later migrations will add patients, reservations, admissions, users, roles and audit logs.
