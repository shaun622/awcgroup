-- Add `businesses.abn` so FieldSuite HQ admin's business-detail query
-- doesn't 400 on AWC. ABN is an Australian Business Number — AWC is
-- UK-based so this column is always NULL for AWC tenants (UK
-- equivalents are companies_house_number + vat_number, which already
-- exist).
--
-- Long-term, HQ admin should switch to a generic legal-id concept that
-- maps per locale; for now adding the column shape so PostgREST can
-- satisfy the SELECT is the smallest fix.

alter table businesses
  add column if not exists abn text;

comment on column businesses.abn is
  'Always NULL for AWC tenants — UK businesses use companies_house_number + vat_number instead. Column exists for FieldSuite HQ admin schema compatibility.';
