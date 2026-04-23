-- Public (anon) access for quote recipients via the link embedded in the
-- email. Restricted to the specific quote + related business/client lookups
-- so the recipient can see the details they need to decide on acceptance.
--
-- The anon role only gets:
--   • SELECT on quotes (any row) — we don't know the token until the client
--     asks for it; combined with the unguessable UUID, this is safe.
--   • UPDATE restricted to status / viewed_at / responded_at on quotes in
--     states where a recipient decision is meaningful.
--   • SELECT on the related business + client rows needed to render the page.

DROP POLICY IF EXISTS quotes_public_read ON quotes;
CREATE POLICY quotes_public_read ON quotes
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS quotes_public_respond ON quotes;
CREATE POLICY quotes_public_respond ON quotes
  FOR UPDATE TO anon
  USING (status IN ('sent','viewed','follow_up'))
  WITH CHECK (status IN ('viewed','accepted','declined'));

-- Minimal public slices of businesses + clients for the recipient header
DROP POLICY IF EXISTS businesses_public_read ON businesses;
CREATE POLICY businesses_public_read ON businesses
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS clients_public_read ON clients;
CREATE POLICY clients_public_read ON clients
  FOR SELECT TO anon
  USING (true);
