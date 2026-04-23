-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  AWC Group — Core Schema                                              ║
-- ║                                                                       ║
-- ║  Multi-tenant service operations database.                            ║
-- ║  Each `businesses` row is a tenant (in AWC's case, AWC Group Ltd).    ║
-- ║  Divisions are text slugs ('pest'/'fire'/'hygiene'/'locksmith') kept  ║
-- ║  in businesses.enabled_divisions and tagged on division-scoped rows.  ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── businesses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  trading_name TEXT,
  logo_url TEXT,
  brand_colour TEXT DEFAULT '#1e2836',

  -- UK-specific
  companies_house_number TEXT,
  vat_number TEXT,
  vat_rate NUMERIC NOT NULL DEFAULT 0.20,
  country_code TEXT NOT NULL DEFAULT 'GB',
  currency TEXT NOT NULL DEFAULT 'GBP',
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  county TEXT,
  postcode TEXT,
  phone TEXT,
  email TEXT,

  -- Divisions
  enabled_divisions TEXT[] NOT NULL DEFAULT ARRAY['pest']::TEXT[],

  -- Billing
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro','enterprise')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

  -- Invoicing
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  default_payment_terms_days INTEGER NOT NULL DEFAULT 14,
  bank_details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS businesses_owner_idx ON businesses(owner_id);

-- ─── staff_members ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,

  role TEXT NOT NULL DEFAULT 'tech' CHECK (role IN ('owner','admin','tech')),
  divisions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,

  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS staff_business_idx ON staff_members(business_id);
CREATE INDEX IF NOT EXISTS staff_auth_idx ON staff_members(auth_user_id);

-- ─── clients ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  client_type TEXT NOT NULL DEFAULT 'residential'
    CHECK (client_type IN ('residential','commercial','public_sector','housing_association','industrial')),
  email TEXT,
  phone TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  postcode TEXT,
  notes TEXT,

  -- Which divisions this client uses (auto-maintained via trigger on premises/jobs/quotes)
  divisions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  billing_email TEXT,
  invoice_payment_terms_days INTEGER,

  assigned_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  pipeline_stage TEXT NOT NULL DEFAULT 'lead'
    CHECK (pipeline_stage IN ('lead','quoted','active','on_hold','lost')),

  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS clients_business_idx ON clients(business_id);
CREATE INDEX IF NOT EXISTS clients_staff_idx ON clients(assigned_staff_id);
CREATE INDEX IF NOT EXISTS clients_pipeline_idx ON clients(business_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS clients_name_trgm_idx ON clients USING gin (name gin_trgm_ops);

-- ─── premises ───────────────────────────────────────────────────────────
-- Division-tagged. A single client can have multiple premises across divisions.
CREATE TABLE IF NOT EXISTS premises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  division_slug TEXT NOT NULL CHECK (division_slug IN ('pest','fire','hygiene','locksmith')),

  name TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT,
  postcode TEXT,

  site_type TEXT NOT NULL DEFAULT 'commercial'
    CHECK (site_type IN ('residential','commercial','industrial','public_sector','rural','roadside')),
  access_notes TEXT,
  hazards JSONB NOT NULL DEFAULT '[]'::jsonb,

  regular_service BOOLEAN NOT NULL DEFAULT false,
  service_frequency TEXT CHECK (service_frequency IN ('weekly','fortnightly','monthly','quarterly','biannual','annual')),
  next_due_at TIMESTAMPTZ,

  -- Division-specific JSONB payload — see AWC_APP_SPEC §5 for examples
  division_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  assigned_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  route_order INTEGER,
  portal_token UUID NOT NULL DEFAULT gen_random_uuid(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geocoded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS premises_business_division_idx ON premises(business_id, division_slug);
CREATE INDEX IF NOT EXISTS premises_client_idx ON premises(client_id);
CREATE INDEX IF NOT EXISTS premises_due_idx ON premises(next_due_at) WHERE regular_service = true;

-- ─── products (per-division library: chemicals / equipment / supplies) ──
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  division_slug TEXT NOT NULL CHECK (division_slug IN ('pest','fire','hygiene','locksmith')),

  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'unit',
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC,
  hourly_rate NUMERIC,

  safety_data_sheet_url TEXT,
  hse_approval TEXT,

  notes TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, division_slug, name)
);
CREATE INDEX IF NOT EXISTS products_division_idx ON products(business_id, division_slug);

-- ─── job_type_templates ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_type_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  division_slug TEXT NOT NULL CHECK (division_slug IN ('pest','fire','hygiene','locksmith')),

  name TEXT NOT NULL,
  description TEXT,
  default_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_duration_minutes INTEGER,
  default_price NUMERIC,
  colour TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, division_slug, name)
);
CREATE INDEX IF NOT EXISTS job_types_division_idx ON job_type_templates(business_id, division_slug);

-- ─── recurring_profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  division_slug TEXT NOT NULL CHECK (division_slug IN ('pest','fire','hygiene','locksmith')),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  premises_id UUID REFERENCES premises(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  notes TEXT,

  frequency TEXT NOT NULL CHECK (frequency IN ('weekly','fortnightly','monthly','quarterly','biannual','annual')),
  start_date DATE NOT NULL,

  duration_type TEXT NOT NULL DEFAULT 'ongoing' CHECK (duration_type IN ('ongoing','until_date','num_visits')),
  end_date DATE,
  total_visits INTEGER,
  completed_visits INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),

  assigned_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  price NUMERIC,
  duration_minutes INTEGER,

  last_generated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS recurring_business_division_idx ON recurring_profiles(business_id, division_slug);
CREATE INDEX IF NOT EXISTS recurring_client_idx ON recurring_profiles(client_id);

-- ─── quotes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  division_slug TEXT NOT NULL CHECK (division_slug IN ('pest','fire','hygiene','locksmith')),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  premises_id UUID REFERENCES premises(id) ON DELETE SET NULL,

  quote_number TEXT NOT NULL,
  subject TEXT,
  scope TEXT,
  terms TEXT,

  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC NOT NULL DEFAULT 0.20,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','follow_up','accepted','declined','expired')),
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  public_token UUID NOT NULL DEFAULT gen_random_uuid(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quotes_business_division_idx ON quotes(business_id, division_slug);
CREATE INDEX IF NOT EXISTS quotes_client_idx ON quotes(client_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(business_id, status);

-- ─── jobs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  division_slug TEXT NOT NULL CHECK (division_slug IN ('pest','fire','hygiene','locksmith')),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  premises_id UUID REFERENCES premises(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  recurring_profile_id UUID REFERENCES recurring_profiles(id) ON DELETE SET NULL,

  job_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  job_type TEXT,

  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','on_hold','completed','cancelled')),
  scheduled_date TIMESTAMPTZ,
  scheduled_duration_minutes INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  assigned_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  price NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS jobs_business_div_status_idx ON jobs(business_id, division_slug, status);
CREATE INDEX IF NOT EXISTS jobs_scheduled_idx ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS jobs_premises_idx ON jobs(premises_id);
CREATE INDEX IF NOT EXISTS jobs_client_idx ON jobs(client_id);

-- ─── job_reports ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  division_slug TEXT NOT NULL CHECK (division_slug IN ('pest','fire','hygiene','locksmith')),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  premises_id UUID REFERENCES premises(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  technician_name TEXT,

  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  notes TEXT,
  signature_url TEXT,
  client_satisfaction INTEGER CHECK (client_satisfaction BETWEEN 1 AND 5),

  duration_minutes INTEGER,
  follow_up_required BOOLEAN NOT NULL DEFAULT false,
  follow_up_notes TEXT,

  -- Division-specific payload — validated client-side from divisionRegistry assessment_schema
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  completed_at TIMESTAMPTZ,
  report_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reports_job_idx ON job_reports(job_id);
CREATE INDEX IF NOT EXISTS reports_business_division_idx ON job_reports(business_id, division_slug);

-- ─── job_tasks / job_photos / consumables_used (children of job_reports) ──
CREATE TABLE IF NOT EXISTS job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID NOT NULL REFERENCES job_reports(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS job_tasks_report_idx ON job_tasks(job_report_id);

CREATE TABLE IF NOT EXISTS job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID NOT NULL REFERENCES job_reports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  signed_url TEXT,
  tag TEXT NOT NULL DEFAULT 'after' CHECK (tag IN ('before','during','after','defect','evidence','hazard')),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS job_photos_report_idx ON job_photos(job_report_id);

CREATE TABLE IF NOT EXISTS consumables_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID NOT NULL REFERENCES job_reports(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  hours_used NUMERIC,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS consumables_report_idx ON consumables_used(job_report_id);

-- ─── invoices ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  division_slug TEXT CHECK (division_slug IN ('pest','fire','hygiene','locksmith')),

  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC NOT NULL DEFAULT 0.20,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','overdue','paid','void')),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  payment_terms_days INTEGER NOT NULL DEFAULT 14,
  payment_reference TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invoices_business_status_idx ON invoices(business_id, status);
CREATE INDEX IF NOT EXISTS invoices_client_idx ON invoices(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_number_unique ON invoices(business_id, invoice_number);

-- ─── activity_feed ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  division_slug TEXT CHECK (division_slug IN ('pest','fire','hygiene','locksmith')),

  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,

  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  read_by UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activity_business_idx ON activity_feed(business_id, created_at DESC);

-- ─── updated_at trigger helper ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'businesses','staff_members','clients','premises','jobs',
    'recurring_profiles','quotes','invoices'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_set_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
