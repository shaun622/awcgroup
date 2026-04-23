-- Allow server-side (admin) invocation of seed_division_templates.
-- The guard now only enforces `current_business_id()` when an authenticated
-- user is present. Server-side (auth.uid() IS NULL) is trusted.
-- row_security off inside the function so SECURITY DEFINER inserts skip RLS —
-- safe because the function itself limits what rows are written.

CREATE OR REPLACE FUNCTION seed_division_templates(_business_id UUID, _division TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'business_id required';
  END IF;
  IF auth.uid() IS NOT NULL AND _business_id <> current_business_id() THEN
    RAISE EXCEPTION 'not authorised to seed this business';
  END IF;

  -- PEST ────────────────────────────────────────────────────────────────
  IF _division = 'pest' THEN
    INSERT INTO job_type_templates (business_id, division_slug, name, description, default_tasks, estimated_duration_minutes, default_price, colour) VALUES
      (_business_id, 'pest', 'Initial Infestation Survey',
        'First visit to assess infestation level and recommend a treatment plan',
        '["Inspect premises","Identify target species","Assess infestation level","Locate entry points & harbourage","Check for non-target wildlife risks","Take photos","Write survey report","Quote customer"]'::jsonb,
        45, 85, '#16A34A'),
      (_business_id, 'pest', 'Residential Rodent Treatment',
        'Rodent control for homes — rats and mice',
        '["Set up exclusion zone","Site survey","Install bait stations","Apply rodenticide (CRRU compliant)","Record bait locations","Advise customer","Schedule follow-up"]'::jsonb,
        60, 120, '#16A34A'),
      (_business_id, 'pest', 'Commercial Rodent Treatment',
        'Rodent control for commercial premises',
        '["Site survey","Review COSHH","Install/check bait stations","Inspect bait consumption","Check proofing","Top up/replace bait","Complete logbook","Issue service certificate"]'::jsonb,
        90, 180, '#16A34A'),
      (_business_id, 'pest', 'Insect Treatment — General',
        'Treatment for ants, cockroaches, fleas, silverfish, etc.',
        '["Identify target species","Review COSHH for chosen product","Apply insecticide","Place monitoring traps","Advise customer on post-treatment","Schedule follow-up if required"]'::jsonb,
        60, 110, '#16A34A'),
      (_business_id, 'pest', 'Wasp Nest Treatment',
        'Single-visit wasp or hornet nest removal',
        '["Locate nest","Set up exclusion zone","Apply insecticide dust","Advise customer on timing","Return to remove nest if contracted"]'::jsonb,
        30, 75, '#16A34A'),
      (_business_id, 'pest', 'Bedbug Heat Treatment',
        'Heat treatment for bedbug infestation',
        '["Prep rooms","Set up heaters","Monitor temperatures","Apply residual insecticide","Cool down","Customer guidance","Schedule follow-up inspection"]'::jsonb,
        240, 480, '#16A34A'),
      (_business_id, 'pest', 'Monthly Commercial Visit',
        'Scheduled monthly monitoring and treatment',
        '["Review logbook","Inspect bait stations","Check insect monitors","Top up consumables","Document findings","Sign off"]'::jsonb,
        60, 75, '#16A34A'),
      (_business_id, 'pest', 'Quarterly Visit',
        'Scheduled quarterly monitoring',
        '["Inspect stations","Check consumption","Review hygiene","Update logbook","Issue certificate"]'::jsonb,
        45, 55, '#16A34A'),
      (_business_id, 'pest', 'Bird Proofing',
        'Install bird netting, spikes or wire systems',
        '["Survey access","Measure area","Install proofing","Test and inspect","Clean up debris","Warranty guidance"]'::jsonb,
        180, 350, '#16A34A'),
      (_business_id, 'pest', 'Emergency Callout',
        'Out-of-hours or same-day emergency response',
        '["Risk assessment","Identify target","Rapid treatment","Document actions","Recommend follow-up"]'::jsonb,
        60, 180, '#DC2626')
    ON CONFLICT (business_id, division_slug, name) DO NOTHING;

    INSERT INTO products (business_id, division_slug, name, category, unit, unit_cost, hourly_rate, hse_approval, notes) VALUES
      (_business_id, 'pest', 'Brodifacoum Wax Block', 'rodenticide', 'kg', 12, NULL, 'HSE 8577', 'Single-feed rodenticide. Indoor/covered bait stations only.'),
      (_business_id, 'pest', 'Difenacoum Wax Block', 'rodenticide', 'kg', 9, NULL, 'HSE 8234', 'Multi-feed. For sensitive sites.'),
      (_business_id, 'pest', 'Bromadiolone Grain', 'rodenticide', 'kg', 8, NULL, 'HSE 9123', 'Palatable grain bait.'),
      (_business_id, 'pest', 'K-Othrine WG 250', 'insecticide', 'g', 0.15, NULL, NULL, 'Residual insecticide — crawling insects.'),
      (_business_id, 'pest', 'Cislin 25 Flow', 'insecticide', 'ml', 0.12, NULL, NULL, 'General-purpose public health insecticide.'),
      (_business_id, 'pest', 'Goliath Cockroach Gel', 'insecticide', 'g', 0.28, NULL, NULL, 'Cockroach gel bait — fipronil.'),
      (_business_id, 'pest', 'Professional Rat Bait Station', 'equipment', 'unit', 7.50, NULL, NULL, 'Lockable tamper-resistant plastic station.'),
      (_business_id, 'pest', 'Insect Monitoring Trap', 'equipment', 'unit', 1.50, NULL, NULL, 'Glue board with pheromone lure.'),
      (_business_id, 'pest', 'UV Fly Killer', 'equipment', 'unit', 120, 5, NULL, 'Commercial grade — 30W shatterproof tubes.'),
      (_business_id, 'pest', '5L Knapsack Sprayer', 'equipment', 'unit', 35, 8, NULL, 'For chemical application.'),
      (_business_id, 'pest', 'P3 Respirator', 'safety', 'unit', 28, 0, NULL, 'Half-mask with P3 filters. Required COSHH.'),
      (_business_id, 'pest', 'UV Torch', 'equipment', 'unit', 15, 0, NULL, 'For rodent urine detection.')
    ON CONFLICT (business_id, division_slug, name) DO NOTHING;
  END IF;

  -- FIRE ────────────────────────────────────────────────────────────────
  IF _division = 'fire' THEN
    INSERT INTO job_type_templates (business_id, division_slug, name, description, default_tasks, estimated_duration_minutes, default_price, colour) VALUES
      (_business_id, 'fire', 'Fire Risk Assessment (Type 1)',
        'Non-destructive common-parts assessment (block of flats)',
        '["Inspect common parts","Review fire doors","Check means of escape","Review emergency lighting","Review signage","Identify hazards","Draft risk rating","Write report"]'::jsonb,
        180, 450, '#DC2626'),
      (_business_id, 'fire', 'Fire Risk Assessment (Type 3)',
        'Destructive assessment (within flats, by sample)',
        '["Common parts review","Sample flat inspections","Destructive inspection of compartmentation","Document findings","Write detailed report with actions"]'::jsonb,
        360, 1200, '#DC2626'),
      (_business_id, 'fire', 'Extinguisher Annual Service',
        'BS 5306-3 compliant annual extinguisher service',
        '["Visual inspection","Pressure check","Seal check","Weigh CO2","Check signage","Update service label","Document in logbook"]'::jsonb,
        60, 95, '#DC2626'),
      (_business_id, 'fire', 'Emergency Lighting Test',
        'Annual 3-hour full discharge test (BS 5266)',
        '["Locate panel","Check battery","Initiate discharge test","Walk-test each fitting","Note failures","Issue certificate"]'::jsonb,
        90, 140, '#DC2626'),
      (_business_id, 'fire', 'Fire Alarm Service — Annual',
        'Annual service to BS 5839',
        '["Test panel","Test each detector","Test call points","Test sounders","Check battery backup","Issue certificate","Update logbook"]'::jsonb,
        120, 220, '#DC2626'),
      (_business_id, 'fire', 'Fire Alarm Service — Quarterly',
        'Quarterly 25% detector test',
        '["Test 25% of detectors","Functional test","Check logbook","Sign off"]'::jsonb,
        60, 120, '#DC2626'),
      (_business_id, 'fire', 'Fire Door Inspection',
        'Per-door inspection to BS 8214',
        '["Inspect door","Check gaps & seals","Check hinges","Check closer","Check signage","Document findings","Photo each door"]'::jsonb,
        30, 35, '#DC2626'),
      (_business_id, 'fire', 'Extinguisher Supply & Install',
        'Supply and commission new extinguishers',
        '["Survey location","Install brackets","Commission unit","Fill out service label","Update asset log","Hand over to client"]'::jsonb,
        90, 180, '#DC2626'),
      (_business_id, 'fire', 'Emergency Call-out',
        'Urgent fire-safety response (tripped alarm, damaged equipment)',
        '["Risk assess","Investigate","Rectify immediate hazard","Advise on permanent fix","Document"]'::jsonb,
        90, 220, '#DC2626')
    ON CONFLICT (business_id, division_slug, name) DO NOTHING;

    INSERT INTO products (business_id, division_slug, name, category, unit, unit_cost, unit_price, notes) VALUES
      (_business_id, 'fire', '6L Water Extinguisher', 'extinguisher', 'unit', 35, 65, 'Class A fires. Common office/commercial.'),
      (_business_id, 'fire', '6L Foam Extinguisher', 'extinguisher', 'unit', 38, 75, 'Class A/B. Multi-purpose.'),
      (_business_id, 'fire', '2kg CO2 Extinguisher', 'extinguisher', 'unit', 45, 85, 'Class B/E. Electrical.'),
      (_business_id, 'fire', '6kg Dry Powder Extinguisher', 'extinguisher', 'unit', 42, 80, 'ABC class. Vehicles and outdoors.'),
      (_business_id, 'fire', '2L Wet Chemical Extinguisher', 'extinguisher', 'unit', 55, 110, 'Class F. Kitchens.'),
      (_business_id, 'fire', 'Smoke Detector (Optical)', 'alarm', 'unit', 18, 35, 'Conventional or addressable.'),
      (_business_id, 'fire', 'Heat Detector', 'alarm', 'unit', 16, 32, 'Rate-of-rise type.'),
      (_business_id, 'fire', 'Manual Call Point', 'alarm', 'unit', 12, 24, 'Resettable glass.'),
      (_business_id, 'fire', 'Sounder Beacon', 'alarm', 'unit', 28, 55, 'Combined audio-visual.'),
      (_business_id, 'fire', 'Bulkhead LED Emergency Light', 'lighting', 'unit', 22, 45, '3-hour autonomy.'),
      (_business_id, 'fire', 'Exit Sign LED', 'lighting', 'unit', 35, 70, 'Maintained/non-maintained switchable.'),
      (_business_id, 'fire', 'Smoke Canister', 'test equipment', 'unit', 5, 0, 'Testifire or equivalent detector test.'),
      (_business_id, 'fire', 'Heat Detector Tester', 'test equipment', 'unit', 180, 0, 'Battery-powered heat simulator.'),
      (_business_id, 'fire', 'Decibel Meter', 'test equipment', 'unit', 95, 0, 'For sounder tests.')
    ON CONFLICT (business_id, division_slug, name) DO NOTHING;
  END IF;

  -- HYGIENE ─────────────────────────────────────────────────────────────
  IF _division = 'hygiene' THEN
    INSERT INTO job_type_templates (business_id, division_slug, name, description, default_tasks, estimated_duration_minutes, default_price, colour) VALUES
      (_business_id, 'hygiene', 'Daily Office Clean',
        'Standard daily clean for offices',
        '["Empty bins","Vacuum carpets","Mop hard floors","Clean toilets","Restock consumables","Wipe touchpoints","Lock up"]'::jsonb,
        90, 85, '#0891B2'),
      (_business_id, 'hygiene', 'Weekly Deep Clean',
        'Weekly deep clean — detailed',
        '["Detail clean toilets","Deep clean kitchen","Dust high-level","Clean windows internal","Sanitise all touchpoints","ATP audit"]'::jsonb,
        180, 150, '#0891B2'),
      (_business_id, 'hygiene', 'Monthly Deep Clean',
        'Comprehensive monthly deep clean',
        '["Full detail clean","Degrease kitchen","Descale washrooms","Clean light fittings","Clean ceiling tiles","Full ATP audit"]'::jsonb,
        240, 220, '#0891B2'),
      (_business_id, 'hygiene', 'Food Hygiene Deep Clean',
        'Kitchen and food-prep area deep clean',
        '["Degrease all surfaces","Clean extraction","Descale sinks","Sanitise prep areas","ATP swab tests","Document for EHO"]'::jsonb,
        240, 280, '#0891B2'),
      (_business_id, 'hygiene', 'Post-Build Sparkle Clean',
        'End-of-works builders clean',
        '["Remove debris","Clean all surfaces","Polish fittings","Clean glass","Remove dust","Final walk-through"]'::jsonb,
        480, 650, '#0891B2'),
      (_business_id, 'hygiene', 'Washroom Service',
        'Washroom-only scheduled clean',
        '["Clean WCs","Sanitise urinals","Clean basins","Mop floors","Restock consumables","Empty bins"]'::jsonb,
        45, 55, '#0891B2'),
      (_business_id, 'hygiene', 'ATP Hygiene Audit',
        'Surface hygiene testing with ATP meter',
        '["Take reference swabs","Test critical surfaces","Document RLU readings","Flag fails","Report to client"]'::jsonb,
        60, 95, '#0891B2')
    ON CONFLICT (business_id, division_slug, name) DO NOTHING;

    INSERT INTO products (business_id, division_slug, name, category, unit, unit_cost, notes) VALUES
      (_business_id, 'hygiene', 'Detergent (Neutral)', 'chemistry', 'litre', 3.50, 'All-purpose cleaner. Dilution 1:50.'),
      (_business_id, 'hygiene', 'Disinfectant (Quat-based)', 'chemistry', 'litre', 5.20, 'BS EN 1276 certified.'),
      (_business_id, 'hygiene', 'Degreaser', 'chemistry', 'litre', 6.80, 'Kitchen and food-prep surfaces.'),
      (_business_id, 'hygiene', 'Descaler', 'chemistry', 'litre', 4.50, 'Acid-based. For limescale.'),
      (_business_id, 'hygiene', 'Alcohol Sanitiser', 'chemistry', 'litre', 8, '70% IPA. Touchpoint sanitisation.'),
      (_business_id, 'hygiene', 'Microfibre Cloth (Colour-Coded)', 'equipment', 'pack of 10', 12, 'Red/Blue/Green/Yellow per BICSc.'),
      (_business_id, 'hygiene', 'Mop System (Velcro)', 'equipment', 'unit', 35, 'Industrial flat mop system.'),
      (_business_id, 'hygiene', 'Upright Vacuum', 'equipment', 'unit', 380, 'Commercial grade with HEPA filter.'),
      (_business_id, 'hygiene', 'Steam Cleaner', 'equipment', 'unit', 850, 'Pressurised dry steam — deep clean.'),
      (_business_id, 'hygiene', 'ATP Meter', 'equipment', 'unit', 620, 'Luminometer + swabs for RLU readings.'),
      (_business_id, 'hygiene', 'Liquid Soap (5L)', 'consumable', 'unit', 12, 'Foaming handwash.'),
      (_business_id, 'hygiene', 'Paper Towel (Roll)', 'consumable', 'unit', 1.80, 'Blue centrefeed.'),
      (_business_id, 'hygiene', 'Toilet Tissue (Roll)', 'consumable', 'unit', 0.45, '2-ply white.'),
      (_business_id, 'hygiene', 'Bin Liners (200 pack)', 'consumable', 'unit', 9, '90-litre heavy duty.')
    ON CONFLICT (business_id, division_slug, name) DO NOTHING;
  END IF;

  -- LOCKSMITH ───────────────────────────────────────────────────────────
  IF _division = 'locksmith' THEN
    INSERT INTO job_type_templates (business_id, division_slug, name, description, default_tasks, estimated_duration_minutes, default_price, colour) VALUES
      (_business_id, 'locksmith', 'Emergency Lockout',
        'Non-destructive entry service',
        '["Verify ownership","Assess lock","Non-destructive entry","Install new cylinder if needed","Test operation","Hand over keys"]'::jsonb,
        60, 95, '#D97706'),
      (_business_id, 'locksmith', 'Lock Upgrade',
        'Replace existing lock with a higher-spec unit',
        '["Survey existing","Remove old lock","Fit new lock","Test operation","Cut additional keys","Advise customer"]'::jsonb,
        90, 150, '#D97706'),
      (_business_id, 'locksmith', 'UPVC Door Repair',
        'Fix or replace UPVC multipoint locks and mechanisms',
        '["Diagnose fault","Remove mechanism","Replace or repair","Adjust alignment","Test operation","Silicone seal"]'::jsonb,
        90, 120, '#D97706'),
      (_business_id, 'locksmith', 'Multipoint Lock Replacement',
        'Complete replacement of UPVC gearbox',
        '["Remove door handle","Remove gearbox","Install new unit","Adjust keep plates","Test cycle","Cut new keys"]'::jsonb,
        120, 220, '#D97706'),
      (_business_id, 'locksmith', 'Master Key System Install',
        'Design and install a master key suite',
        '["Survey site","Design suite","Order cylinders","Install","Cut master keys","Issue key register","Hand over"]'::jsonb,
        240, 650, '#D97706'),
      (_business_id, 'locksmith', 'Access Control Install',
        'Install keypad or card-reader access system',
        '["Survey door","Fit electric strike","Install reader","Wire up controller","Commission","Test","Train customer"]'::jsonb,
        240, 580, '#D97706'),
      (_business_id, 'locksmith', 'Security Survey',
        'On-site assessment of premises security',
        '["Walk-through","Photograph weak points","Advise on upgrades","Written report","Quote recommendations"]'::jsonb,
        60, 75, '#D97706'),
      (_business_id, 'locksmith', 'Key Cutting (On-Site)',
        'Mobile key duplication visit',
        '["Verify authority","Copy keys","Test in lock","Hand over"]'::jsonb,
        30, 25, '#D97706'),
      (_business_id, 'locksmith', 'Safe Opening',
        'Non-destructive or destructive safe opening',
        '["Verify ownership","Assess safe","Open by most suitable method","Repair/replace lock if needed","Test"]'::jsonb,
        180, 380, '#D97706')
    ON CONFLICT (business_id, division_slug, name) DO NOTHING;

    INSERT INTO products (business_id, division_slug, name, category, unit, unit_cost, unit_price, notes) VALUES
      (_business_id, 'locksmith', 'Yale 5-Lever Mortice', 'lock', 'unit', 45, 95, 'BS 3621 — insurance compliant.'),
      (_business_id, 'locksmith', 'Chubb 3G110 Mortice', 'lock', 'unit', 85, 165, 'BS 3621 high security.'),
      (_business_id, 'locksmith', 'Banham M2002 Deadlock', 'lock', 'unit', 120, 220, 'Premium British deadlock.'),
      (_business_id, 'locksmith', 'Mul-T-Lock Classic Pro Euro Cylinder', 'cylinder', 'unit', 75, 145, 'Anti-snap, anti-bump.'),
      (_business_id, 'locksmith', 'ERA Fortress Euro Cylinder', 'cylinder', 'unit', 25, 55, 'TS007 3* rated.'),
      (_business_id, 'locksmith', 'Yale Oval Cylinder', 'cylinder', 'unit', 18, 38, 'Standard oval profile.'),
      (_business_id, 'locksmith', 'UPVC Gearbox (Standard)', 'hardware', 'unit', 38, 85, 'Common Fullex/ERA/Mila replacement.'),
      (_business_id, 'locksmith', 'UPVC Handle Set', 'hardware', 'unit', 22, 50, 'Inline anti-snap handle.'),
      (_business_id, 'locksmith', 'Door Hinge (Flag)', 'hardware', 'unit', 8, 22, 'Standard UPVC flag hinge.'),
      (_business_id, 'locksmith', 'Keep Plate', 'hardware', 'unit', 4, 12, 'Receiver for UPVC gearbox hooks.'),
      (_business_id, 'locksmith', 'Pick Set (Professional)', 'tool', 'unit', 180, 0, 'Full SouthOrd or Peterson set.'),
      (_business_id, 'locksmith', 'Lishi Decoder', 'tool', 'unit', 120, 0, 'Specific-profile decoder.'),
      (_business_id, 'locksmith', 'Electric Strike', 'access control', 'unit', 65, 150, 'Fail-safe or fail-secure.'),
      (_business_id, 'locksmith', 'Keypad Reader', 'access control', 'unit', 85, 180, 'Standalone or controller-connected.')
    ON CONFLICT (business_id, division_slug, name) DO NOTHING;
  END IF;
END;
$$;
