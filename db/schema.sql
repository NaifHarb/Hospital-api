BEGIN;
CREATE TABLE IF NOT EXISTS departments (
 id BIGSERIAL PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 code VARCHAR(30) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS rooms (
 id BIGSERIAL PRIMARY KEY,
 department_id BIGINT NOT NULL REFERENCES departments(id),
 room_number VARCHAR(30) NOT NULL,
 floor INTEGER,
 UNIQUE (department_id, room_number)
);
CREATE TABLE IF NOT EXISTS beds (
 id BIGSERIAL PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 bed_number VARCHAR(30) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'available'
 CHECK (status IN ('available','occupied','reserved','cleaning','maintenance')),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (room_id, bed_number)
);
CREATE INDEX IF NOT EXISTS beds_status_idx ON beds(status);
CREATE INDEX IF NOT EXISTS rooms_department_idx ON rooms(department_id);
COMMIT;
