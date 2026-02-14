-- =============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- For Customer Feedback Dashboard & Analytics
-- =============================================

-- Additional indexes for reports table (heavy query optimization)
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_incident_date ON public.reports(incident_date);
CREATE INDEX IF NOT EXISTS idx_reports_station_id ON public.reports(station_id);
CREATE INDEX IF NOT EXISTS idx_reports_area_category ON public.reports(area_category);
CREATE INDEX IF NOT EXISTS idx_reports_main_category ON public.reports(main_category);
CREATE INDEX IF NOT EXISTS idx_reports_sub_category ON public.reports(sub_category);
CREATE INDEX IF NOT EXISTS idx_reports_target_division ON public.reports(target_division);
CREATE INDEX IF NOT EXISTS idx_reports_is_flight_related ON public.reports(is_flight_related);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reports_status_created_at ON public.reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_branch_category ON public.reports(branch, category);
CREATE INDEX IF NOT EXISTS idx_reports_airline_date ON public.reports(airline, incident_date);
CREATE INDEX IF NOT EXISTS idx_reports_station_category ON public.reports(station_id, category);

-- Dashboard & Analytics indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_charts_page_name ON public.dashboard_charts(page_name);
CREATE INDEX IF NOT EXISTS idx_dashboard_charts_position ON public.dashboard_charts(position);
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_is_public ON public.custom_dashboards(is_public);

-- =============================================
-- MATERIALIZED VIEWS FOR HEAVY AGGREGATIONS
-- =============================================

-- Materialized View: Monthly Report Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_report_summary AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    status,
    category,
    branch,
    airline,
    COUNT(*) as total_reports,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count,
    COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_count,
    COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_count
FROM public.reports
WHERE created_at >= NOW() - INTERVAL '2 years'
GROUP BY 
    DATE_TRUNC('month', created_at),
    status,
    category,
    branch,
    airline
ORDER BY month DESC;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_summary 
ON mv_monthly_report_summary(month, status, category, branch, airline);

-- Materialized View: Branch Performance Metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_branch_performance AS
SELECT 
    branch,
    station_id,
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_reports,
    COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_reports,
    COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_reports,
    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_reports,
    AVG(CASE 
        WHEN closed_at IS NOT NULL AND created_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (closed_at - created_at))/3600 
        ELSE NULL 
    END) as avg_resolution_hours
FROM public.reports
WHERE created_at >= NOW() - INTERVAL '1 year'
GROUP BY branch, station_id, DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_branch_performance 
ON mv_branch_performance(branch, station_id, month);

-- Materialized View: Category Trends
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_category_trends AS
SELECT 
    category,
    main_category,
    sub_category,
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as count,
    COUNT(CASE WHEN is_flight_related THEN 1 END) as flight_related_count
FROM public.reports
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY category, main_category, sub_category, DATE_TRUNC('week', created_at)
ORDER BY week DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_category_trends 
ON mv_category_trends(category, main_category, sub_category, week);

-- =============================================
-- REFRESH FUNCTIONS
-- =============================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_report_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_branch_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_trends;
END;
$$;

-- Function to refresh specific view
CREATE OR REPLACE FUNCTION refresh_monthly_summary()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_report_summary;
END;
$$;

-- =============================================
-- QUERY PERFORMANCE FUNCTIONS
-- =============================================

-- Function to get report counts by date range (optimized)
CREATE OR REPLACE FUNCTION get_report_counts_by_date(
    start_date date,
    end_date date,
    group_by text DEFAULT 'day'
)
RETURNS TABLE (
    period timestamp with time zone,
    total bigint,
    open_count bigint,
    closed_count bigint,
    in_progress_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC(group_by, created_at) as period,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_count,
        COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_count,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_count
    FROM public.reports
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY DATE_TRUNC(group_by, created_at)
    ORDER BY period;
END;
$$;

-- Function to get top categories with counts
CREATE OR REPLACE FUNCTION get_top_categories(
    limit_count integer DEFAULT 10,
    start_date date DEFAULT (CURRENT_DATE - INTERVAL '30 days'),
    end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    category text,
    count bigint,
    percentage numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_count bigint;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM public.reports
    WHERE created_at BETWEEN start_date AND end_date;
    
    RETURN QUERY
    SELECT 
        r.category,
        COUNT(*) as count,
        ROUND((COUNT(*)::numeric / NULLIF(total_count, 0) * 100), 2) as percentage
    FROM public.reports r
    WHERE r.created_at BETWEEN start_date AND end_date
    GROUP BY r.category
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$;

-- =============================================
-- AUTO-REFRESH TRIGGER (Optional)
-- =============================================

-- Trigger function to refresh views on data change
CREATE OR REPLACE FUNCTION trigger_refresh_analytics()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Schedule refresh (runs asynchronously)
    PERFORM pg_notify('refresh_analytics', 'reports_changed');
    RETURN NEW;
END;
$$;

-- Create trigger (uncomment if you want auto-refresh on every insert/update)
-- DROP TRIGGER IF EXISTS trg_refresh_analytics ON public.reports;
-- CREATE TRIGGER trg_refresh_analytics
--     AFTER INSERT OR UPDATE ON public.reports
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION trigger_refresh_analytics();
