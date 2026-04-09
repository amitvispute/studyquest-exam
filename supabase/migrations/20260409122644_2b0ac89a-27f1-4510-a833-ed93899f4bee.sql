-- Allow students to read ALL class entries (shared data)
CREATE POLICY "Students can read all class entries"
ON public.class_entries
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'student'::app_role));

-- Allow students to update ANY class entry (for shared class+date entries)
CREATE POLICY "Students can update all class entries"
ON public.class_entries
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'student'::app_role))
WITH CHECK (has_role(auth.uid(), 'student'::app_role));