-- Per-business VAT opt-in. Until A Wilkinson Company hits the UK
-- VAT registration threshold (£90k turnover) — or if they
-- temporarily de-register — they can't legally charge VAT on
-- quotes / invoices. The previous behaviour assumed VAT was always
-- charged at the rate stored on businesses.vat_rate, with no way
-- to disable it (typing 0 in the rate field silently snapped back
-- to the default).
--
-- Default true preserves current behaviour for existing rows.
-- Operators who flip this off get rate=0 written onto new docs,
-- the VAT line is hidden in totals / portal pages, and the totals
-- card just shows Subtotal → Total without a VAT row.
--
-- Per-doc vat_rate stays as the source of truth for an issued doc,
-- so toggling this off at the business level doesn't retroactively
-- rewrite history.

alter table public.businesses
  add column if not exists vat_enabled boolean not null default true;

comment on column public.businesses.vat_enabled is
  'Whether this business currently charges VAT. False = unregistered (or temporarily not charging); new quotes / invoices write vat_rate=0 and the VAT line is hidden in totals.';
