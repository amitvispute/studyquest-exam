
-- Create ai_mock_exams table
CREATE TABLE public.ai_mock_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  student_user_id uuid NOT NULL,
  title text NOT NULL,
  subjects text[] NOT NULL DEFAULT '{}',
  topics text DEFAULT '',
  num_questions integer NOT NULL DEFAULT 10,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_mock_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can manage own created exams" ON public.ai_mock_exams
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'parent'::app_role) AND created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'parent'::app_role) AND created_by = auth.uid());

CREATE POLICY "Students can read assigned exams" ON public.ai_mock_exams
  FOR SELECT TO authenticated
  USING (student_user_id = auth.uid());

CREATE POLICY "Students can update assigned exam status" ON public.ai_mock_exams
  FOR UPDATE TO authenticated
  USING (student_user_id = auth.uid())
  WITH CHECK (student_user_id = auth.uid());

-- Create ai_mock_questions table
CREATE TABLE public.ai_mock_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.ai_mock_exams(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer text NOT NULL,
  subject text NOT NULL,
  topic text DEFAULT ''
);

ALTER TABLE public.ai_mock_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read questions for own exams" ON public.ai_mock_questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_mock_exams WHERE id = exam_id AND created_by = auth.uid()));

CREATE POLICY "Students can read questions for assigned exams" ON public.ai_mock_questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_mock_exams WHERE id = exam_id AND student_user_id = auth.uid()));

-- Create ai_mock_answers table
CREATE TABLE public.ai_mock_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.ai_mock_exams(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.ai_mock_questions(id) ON DELETE CASCADE,
  student_answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_mock_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own answers" ON public.ai_mock_answers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_mock_exams WHERE id = exam_id AND student_user_id = auth.uid()));

CREATE POLICY "Students can read own answers" ON public.ai_mock_answers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_mock_exams WHERE id = exam_id AND student_user_id = auth.uid()));

CREATE POLICY "Parents can read answers for own exams" ON public.ai_mock_answers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_mock_exams WHERE id = exam_id AND created_by = auth.uid()));

-- Allow service role to insert questions (from edge function)
CREATE POLICY "Service role can insert questions" ON public.ai_mock_questions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'parent'::app_role));
