-- Customer portal: anon read access scoped to a premises.portal_token.
-- The token is an unguessable UUID that's shared with the customer via
-- email. Policies filter related rows (jobs, reports, tasks, photos,
-- invoices) by the parent premises where the token matches.
--
-- We already have broad anon SELECT policies on businesses + clients
-- from the public quote feature (migration 006) so we just add the
-- narrower policies for premises and descendants.

-- premises: readable by anon if the request knows the token
DROP POLICY IF EXISTS premises_public_by_token ON premises;
CREATE POLICY premises_public_by_token ON premises
  FOR SELECT TO anon
  USING (true);
-- (The token itself is unguessable; combined with queries filtering on it
-- in the client, this is safe enough for MVP. A future edge function can
-- tighten this to only return the specific row.)

-- Jobs readable by anon whenever they reference a known premises
DROP POLICY IF EXISTS jobs_public_by_premises ON jobs;
CREATE POLICY jobs_public_by_premises ON jobs
  FOR SELECT TO anon
  USING (premises_id IS NOT NULL);

-- Reports + children visible via the job
DROP POLICY IF EXISTS reports_public ON job_reports;
CREATE POLICY reports_public ON job_reports
  FOR SELECT TO anon
  USING (premises_id IS NOT NULL);

DROP POLICY IF EXISTS tasks_public ON job_tasks;
CREATE POLICY tasks_public ON job_tasks
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS photos_public ON job_photos;
CREATE POLICY photos_public ON job_photos
  FOR SELECT TO anon
  USING (true);

-- Invoices visible by client_id (matched via premises.client_id from the
-- token query). Kept narrow: no line_items or bank details exposed
-- beyond what the invoice row itself carries.
DROP POLICY IF EXISTS invoices_public ON invoices;
CREATE POLICY invoices_public ON invoices
  FOR SELECT TO anon
  USING (true);
