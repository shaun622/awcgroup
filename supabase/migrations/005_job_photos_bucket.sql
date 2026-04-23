-- Storage bucket + RLS policies for job report photos.
-- Path convention: job-photos/{business_id}/{job_id}/{filename}
-- RLS restricts upload/read/delete to a user whose current_business_id()
-- matches the folder segment. Non-public bucket — signed URLs only.

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "job-photos tenant select" ON storage.objects;
CREATE POLICY "job-photos tenant select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] = current_business_id()::text
  );

DROP POLICY IF EXISTS "job-photos tenant insert" ON storage.objects;
CREATE POLICY "job-photos tenant insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] = current_business_id()::text
  );

DROP POLICY IF EXISTS "job-photos tenant delete" ON storage.objects;
CREATE POLICY "job-photos tenant delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] = current_business_id()::text
  );
