CREATE POLICY "Students can read all mock exams"
ON public.mock_exams
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'student'::app_role));