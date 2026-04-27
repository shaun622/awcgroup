-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  AWC Group — Fire Door Register & Assessments                         ║
-- ║                                                                       ║
-- ║  Fire-division feature. Doors are long-lived register entries that    ║
-- ║  belong to a premises. Assessments are point-in-time records (one     ║
-- ║  per inspection visit) holding the 71-item BS 8214:2016 checklist     ║
-- ║  in a single JSONB `responses` map plus the dual-signature sign-off.  ║
-- ║                                                                       ║
-- ║  Recurring re-inspection: defaults to a premises-level                ║
-- ║  recurring_profile (profile_type = 'fire_door_inspection' with        ║
-- ║  fire_door_id = NULL = covers all doors at that premises). Optional   ║
-- ║  per-door override = a recurring_profile with fire_door_id set.       ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- ─── add qualification to staff_members ────────────────────────────────
-- Auto-fills the assessor_qualification field on each new assessment so
-- the tech doesn't retype their cert number every visit.
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS qualification TEXT;

-- ─── fire_doors ─────────────────────────────────────────────────────────
-- One row per physical door in a building. The door's metadata (ref,
-- location, rating) carries forward across assessments; pass/fail does not.
CREATE TABLE IF NOT EXISTS fire_doors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  premises_id UUID NOT NULL REFERENCES premises(id) ON DELETE CASCADE,

  ref TEXT NOT NULL,                       -- "Door 1" / "FD-L2-S2" / "Flat 12 entrance"
  location TEXT,                           -- "Communal corridor 2nd floor"
  floor TEXT,                              -- "Ground" / "L2" / "Basement"

  -- Rating: known FD ratings + 'custom' escape hatch with free text
  rating TEXT
    CHECK (rating IS NULL OR rating IN ('FD30','FD30S','FD60','FD60S','FD90','FD120','custom')),
  rating_custom TEXT,

  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,    -- soft-archive (preserve assessment history)

  -- Optional per-door re-inspection override. NULL = inherit from premises.
  reinspection_frequency TEXT
    CHECK (reinspection_frequency IS NULL OR reinspection_frequency IN
      ('weekly','fortnightly','monthly','quarterly','biannual','annual')),
  next_due_at TIMESTAMPTZ,                 -- denormalised for fast schedule queries

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ref must be unique within a premises so auto-suggest never duplicates
  UNIQUE (premises_id, ref)
);
CREATE INDEX IF NOT EXISTS fire_doors_business_idx ON fire_doors(business_id);
CREATE INDEX IF NOT EXISTS fire_doors_premises_idx ON fire_doors(premises_id);
CREATE INDEX IF NOT EXISTS fire_doors_due_idx
  ON fire_doors(next_due_at) WHERE active = true AND next_due_at IS NOT NULL;

-- ─── fire_door_assessments ─────────────────────────────────────────────
-- Each row = one inspection visit's checklist for one door.
-- `responses` is keyed by item ref ("1.1" through "11.6") with shape:
--   { "1.1": { "result":"pass"|"fail"|"na", "note":"…", "photo_url":"…" }, … }
-- Snapshot fields preserve door metadata at the time of inspection so
-- historical reports stay stable even if door fields are later edited.
CREATE TABLE IF NOT EXISTS fire_door_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  fire_door_id UUID NOT NULL REFERENCES fire_doors(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed')),

  -- Assessor (us)
  assessor_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  assessor_name TEXT,
  assessor_qualification TEXT,
  assessor_company TEXT,
  assessor_signature_url TEXT,
  assessor_signed_at TIMESTAMPTZ,

  -- Responsible person (signs in-app at sign-off)
  responsible_name TEXT,
  responsible_role TEXT,
  responsible_signature_url TEXT,
  responsible_signed_at TIMESTAMPTZ,

  -- The 71-item checklist responses (see comment above)
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Roll-up — denormalised at completion so list views don't scan jsonb
  outcome TEXT
    CHECK (outcome IS NULL OR outcome IN ('pass','fail','needs_investigation')),
  pass_count INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  na_count   INTEGER NOT NULL DEFAULT 0,

  defects_summary TEXT,
  recommended_actions TEXT,
  urgency TEXT
    CHECK (urgency IS NULL OR urgency IN ('immediate','urgent','routine','none')),
  reassessment_required BOOLEAN NOT NULL DEFAULT false,
  reassessment_target_date DATE,

  -- Door metadata snapshotted at the time of assessment
  door_ref_snapshot TEXT,
  door_location_snapshot TEXT,
  door_rating_snapshot TEXT,
  door_floor_snapshot TEXT,

  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fda_business_idx ON fire_door_assessments(business_id);
CREATE INDEX IF NOT EXISTS fda_door_idx ON fire_door_assessments(fire_door_id, assessed_at DESC);
CREATE INDEX IF NOT EXISTS fda_status_idx ON fire_door_assessments(business_id, status);

-- ─── recurring_profiles: extend for fire-door re-inspection ────────────
-- Existing rows default to profile_type='job' so nothing breaks.
-- A fire-door inspection profile with fire_door_id = NULL covers all doors
-- at that premises; with fire_door_id set it overrides one specific door.
ALTER TABLE recurring_profiles
  ADD COLUMN IF NOT EXISTS profile_type TEXT NOT NULL DEFAULT 'job'
    CHECK (profile_type IN ('job','fire_door_inspection'));

ALTER TABLE recurring_profiles
  ADD COLUMN IF NOT EXISTS fire_door_id UUID
    REFERENCES fire_doors(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS recurring_fire_door_idx ON recurring_profiles(fire_door_id)
  WHERE fire_door_id IS NOT NULL;

-- ─── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE fire_doors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_door_assessments  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fire_doors_rw ON fire_doors;
CREATE POLICY fire_doors_rw ON fire_doors
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

DROP POLICY IF EXISTS fda_rw ON fire_door_assessments;
CREATE POLICY fda_rw ON fire_door_assessments
  FOR ALL USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

-- ─── updated_at triggers ────────────────────────────────────────────────
DROP TRIGGER IF EXISTS fire_doors_set_updated_at ON fire_doors;
CREATE TRIGGER fire_doors_set_updated_at BEFORE UPDATE ON fire_doors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS fda_set_updated_at ON fire_door_assessments;
CREATE TRIGGER fda_set_updated_at BEFORE UPDATE ON fire_door_assessments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── realtime ──────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE fire_doors;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE fire_door_assessments;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- ─── storage bucket: fire-door-evidence ────────────────────────────────
-- Path: fire-door-evidence/{business_id}/{door_id}/{filename}
-- Holds per-item Fail photos AND signature PNGs. Non-public; signed URLs only.
INSERT INTO storage.buckets (id, name, public)
VALUES ('fire-door-evidence', 'fire-door-evidence', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "fire-door-evidence tenant select" ON storage.objects;
CREATE POLICY "fire-door-evidence tenant select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fire-door-evidence'
    AND (storage.foldername(name))[1] = current_business_id()::text
  );

DROP POLICY IF EXISTS "fire-door-evidence tenant insert" ON storage.objects;
CREATE POLICY "fire-door-evidence tenant insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fire-door-evidence'
    AND (storage.foldername(name))[1] = current_business_id()::text
  );

DROP POLICY IF EXISTS "fire-door-evidence tenant delete" ON storage.objects;
CREATE POLICY "fire-door-evidence tenant delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'fire-door-evidence'
    AND (storage.foldername(name))[1] = current_business_id()::text
  );
