-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  AWC Group — Row Level Security                                       ║
-- ║                                                                       ║
-- ║  Every tenant-scoped table locks reads/writes to the caller's         ║
-- ║  business_id. The helper `current_business_id()` returns the business ║
-- ║  the current auth user owns OR is a staff member of.                  ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- ─── helper function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_business_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM businesses WHERE owner_id = auth.uid()
  UNION ALL
  SELECT business_id FROM staff_members
    WHERE auth_user_id = auth.uid() AND active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION current_business_id() TO anon, authenticated;

-- ─── enable RLS on every tenant table ───────────────────────────────────
ALTER TABLE businesses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE premises            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_type_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumables_used    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed       ENABLE ROW LEVEL SECURITY;

-- ─── businesses ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS businesses_select ON businesses;
CREATE POLICY businesses_select ON businesses
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (SELECT business_id FROM staff_members WHERE auth_user_id = auth.uid() AND active = true)
  );

DROP POLICY IF EXISTS businesses_insert ON businesses;
CREATE POLICY businesses_insert ON businesses
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS businesses_update ON businesses;
CREATE POLICY businesses_update ON businesses
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS businesses_delete ON businesses;
CREATE POLICY businesses_delete ON businesses
  FOR DELETE USING (owner_id = auth.uid());

-- ─── generic tenant policy: business_id = current_business_id() ─────────
-- (applied to every other tenant-scoped table below)

-- staff_members
DROP POLICY IF EXISTS staff_rw ON staff_members;
CREATE POLICY staff_rw ON staff_members
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- clients
DROP POLICY IF EXISTS clients_rw ON clients;
CREATE POLICY clients_rw ON clients
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- premises
DROP POLICY IF EXISTS premises_rw ON premises;
CREATE POLICY premises_rw ON premises
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- products
DROP POLICY IF EXISTS products_rw ON products;
CREATE POLICY products_rw ON products
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- job_type_templates
DROP POLICY IF EXISTS job_types_rw ON job_type_templates;
CREATE POLICY job_types_rw ON job_type_templates
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- recurring_profiles
DROP POLICY IF EXISTS recurring_rw ON recurring_profiles;
CREATE POLICY recurring_rw ON recurring_profiles
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- quotes
DROP POLICY IF EXISTS quotes_rw ON quotes;
CREATE POLICY quotes_rw ON quotes
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- jobs
DROP POLICY IF EXISTS jobs_rw ON jobs;
CREATE POLICY jobs_rw ON jobs
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- job_reports
DROP POLICY IF EXISTS reports_rw ON job_reports;
CREATE POLICY reports_rw ON job_reports
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- Child tables (go through parent)
DROP POLICY IF EXISTS job_tasks_rw ON job_tasks;
CREATE POLICY job_tasks_rw ON job_tasks
  FOR ALL USING (job_report_id IN (SELECT id FROM job_reports WHERE business_id = current_business_id()))
  WITH CHECK (job_report_id IN (SELECT id FROM job_reports WHERE business_id = current_business_id()));

DROP POLICY IF EXISTS job_photos_rw ON job_photos;
CREATE POLICY job_photos_rw ON job_photos
  FOR ALL USING (job_report_id IN (SELECT id FROM job_reports WHERE business_id = current_business_id()))
  WITH CHECK (job_report_id IN (SELECT id FROM job_reports WHERE business_id = current_business_id()));

DROP POLICY IF EXISTS consumables_rw ON consumables_used;
CREATE POLICY consumables_rw ON consumables_used
  FOR ALL USING (job_report_id IN (SELECT id FROM job_reports WHERE business_id = current_business_id()))
  WITH CHECK (job_report_id IN (SELECT id FROM job_reports WHERE business_id = current_business_id()));

-- invoices
DROP POLICY IF EXISTS invoices_rw ON invoices;
CREATE POLICY invoices_rw ON invoices
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- activity_feed
DROP POLICY IF EXISTS activity_rw ON activity_feed;
CREATE POLICY activity_rw ON activity_feed
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- ─── realtime: expose activity_feed, jobs, quotes, job_reports, clients ─
-- (Supabase Realtime listens on publication 'supabase_realtime')
DO $$
BEGIN
  -- Add tables to the realtime publication if present
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE job_reports;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE clients;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
