-- RENAME reports table columns if they exist but with different names, or ADD them
-- This script ensures the 'reports' table has all necessary columns for the new Wizard form.

-- 1. Add Columns to 'reports' table
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS airline TEXT,
ADD COLUMN IF NOT EXISTS flight_number TEXT,
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS route TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS area_category TEXT,
ADD COLUMN IF NOT EXISTS root_cause TEXT,
ADD COLUMN IF NOT EXISTS action_taken TEXT,
ADD COLUMN IF NOT EXISTS reporter_name TEXT,
ADD COLUMN IF NOT EXISTS evidence_url TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT;

-- 2. Create Storage Bucket 'evidence' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies (RLS)
-- Allow Public Read Access
DROP POLICY IF EXISTS "Public Select" ON storage.objects;
CREATE POLICY "Public Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'evidence' );

-- Allow Authenticated Uploads
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'evidence' AND auth.role() = 'authenticated' );

-- 4. Enable RLS on reports if not already (Good practice)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow Authenticated Users to Insert Reports
DROP POLICY IF EXISTS "Authenticated Insert Reports" ON reports;
CREATE POLICY "Authenticated Insert Reports"
ON reports FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );

-- Allow Users to View Their Own Reports (Optional, assuming you might need this)
-- CREATE POLICY "View Own Reports" ON reports FOR SELECT USING (auth.uid() = user_id);
