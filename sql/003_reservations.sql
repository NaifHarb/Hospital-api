-- Apply after sql/001_init.sql. Synthetic demo references only.
CREATE TABLE IF NOT EXISTS bed_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id uuid NOT NULL REFERENCES beds(id) ON DELETE RESTRICT,
  reference_code varchar(60) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_reservation_per_bed ON bed_reservations(bed_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS bed_reservations_reference_idx ON bed_reservations(reference_code);
