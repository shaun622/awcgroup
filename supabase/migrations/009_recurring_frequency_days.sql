-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  Custom interval support for recurring_profiles                       ║
-- ║                                                                       ║
-- ║  The `frequency` enum (weekly/fortnightly/monthly/quarterly/biannual/ ║
-- ║  annual) covers the common cases but doesn't allow odd cadences      ║
-- ║  ("every 21 days", "every 5 weeks"). When `frequency_days` is set    ║
-- ║  it overrides the enum — the schedule projection adds N calendar     ║
-- ║  days per completed visit instead of stepping through the enum.      ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

ALTER TABLE recurring_profiles
  ADD COLUMN IF NOT EXISTS frequency_days INTEGER
    CHECK (frequency_days IS NULL OR frequency_days BETWEEN 1 AND 3650);
