CREATE POLICY "Students can read all class schedules"
ON public.class_schedules FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'student'::app_role));