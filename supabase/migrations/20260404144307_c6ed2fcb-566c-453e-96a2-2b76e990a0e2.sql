CREATE POLICY "Parents can update all mock exams"
ON public.mock_exams FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'parent'::app_role))
WITH CHECK (has_role(auth.uid(), 'parent'::app_role));