
-- AI Mentor usage tracking
CREATE TABLE public.ai_mentor_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.ai_mentor_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own usage" ON public.ai_mentor_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own usage" ON public.ai_mentor_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own usage" ON public.ai_mentor_usage
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can read all usage" ON public.ai_mentor_usage
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'parent'::app_role));

-- AI Mentor settings (parent-configurable daily limit)
CREATE TABLE public.ai_mentor_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL UNIQUE,
  daily_limit integer NOT NULL DEFAULT 20,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_mentor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can manage settings" ON public.ai_mentor_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'parent'::app_role))
  WITH CHECK (has_role(auth.uid(), 'parent'::app_role));

CREATE POLICY "Students can read own settings" ON public.ai_mentor_settings
  FOR SELECT TO authenticated USING (student_user_id = auth.uid());
