
CREATE POLICY "Parents can delete own questions"
ON public.ai_mock_questions
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ai_mock_exams
    WHERE public.ai_mock_exams.id = public.ai_mock_questions.exam_id
    AND public.ai_mock_exams.created_by = auth.uid()
  )
);

CREATE POLICY "Parents can delete own answers"
ON public.ai_mock_answers
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ai_mock_exams
    WHERE public.ai_mock_exams.id = public.ai_mock_answers.exam_id
    AND public.ai_mock_exams.created_by = auth.uid()
  )
);
