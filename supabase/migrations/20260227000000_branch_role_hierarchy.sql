-- Update role constraint to include new branch roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'SUPER_ADMIN',
    'DIVISI_OS', 'DIVISI_OT', 'DIVISI_OP', 'DIVISI_UQ', 'DIVISI_HC', 'DIVISI_HT',
    'ANALYST',
    'MANAGER_CABANG',
    'STAFF_CABANG'
  ));

-- Migrate existing CABANG users to MANAGER_CABANG
UPDATE users
SET role = 'MANAGER_CABANG'
WHERE role = 'CABANG';

-- Add performance index for station-based role queries
CREATE INDEX IF NOT EXISTS idx_users_station_role
  ON users(station_id, role)
  WHERE status = 'active';

-- Add comment for documentation
COMMENT ON CONSTRAINT users_role_check ON users IS
  'Branch roles: MANAGER_CABANG (@gapura.id), STAFF_CABANG (non-@gapura.id)';
