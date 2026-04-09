-- Allow parents to delete any mock exam
CREATE POLICY "Parents can delete all mock exams"
ON public.mock_exams
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'parent'::app_role));

-- Allow parents to delete any class entry
CREATE POLICY "Parents can delete all class entries"
ON public.class_entries
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'parent'::app_role));