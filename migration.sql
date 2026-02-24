CREATE TABLE IF NOT EXISTS public.report_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT NOT NULL UNIQUE, -- e.g. "NON CARGO!row_2"
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by source_id
CREATE INDEX IF NOT EXISTS idx_report_mappings_source_id ON public.report_mappings(source_id);

-- Update report_comments to reference the mapping ID if it exists?
-- Actually, it's simpler to just store the UUID in report_id and use it as the source of truth.
