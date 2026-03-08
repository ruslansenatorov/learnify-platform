
-- Create storage bucket for course videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('course-videos', 'course-videos', true, 5368709120);

-- Allow authenticated users (teachers) to upload videos
CREATE POLICY "Teachers can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-videos'
  AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
);

-- Allow anyone to view videos (public bucket)
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-videos');

-- Allow teachers/admins to delete their videos
CREATE POLICY "Teachers can delete videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-videos'
  AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
);

-- Allow teachers/admins to update videos
CREATE POLICY "Teachers can update videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-videos'
  AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
);
