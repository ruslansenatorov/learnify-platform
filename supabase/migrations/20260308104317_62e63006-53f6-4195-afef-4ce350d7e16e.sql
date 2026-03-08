
-- Admins can see all courses
CREATE POLICY "Admins can see all courses"
ON public.courses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all courses
CREATE POLICY "Admins can update all courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete all courses
CREATE POLICY "Admins can delete all courses"
ON public.courses
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
