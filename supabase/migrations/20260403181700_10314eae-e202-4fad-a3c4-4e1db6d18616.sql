
-- Daily logs table
CREATE TABLE public.daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  subject text NOT NULL,
  minutes integer NOT NULL DEFAULT 0,
  questions integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily logs" ON public.daily_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily logs" ON public.daily_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can read all daily logs" ON public.daily_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'parent'));

-- Mock exams table
CREATE TABLE public.mock_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  provider text NOT NULL,
  english_score integer,
  maths_score integer,
  vr_score integer,
  nvr_score integer,
  total_score integer,
  max_score integer DEFAULT 400,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own mock exams" ON public.mock_exams
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mock exams" ON public.mock_exams
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can read all mock exams" ON public.mock_exams
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'parent'));

-- Class schedules table (dates scheduled by parents)
CREATE TABLE public.class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_name text NOT NULL,
  scheduled_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, class_name, scheduled_date)
);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read class schedules" ON public.class_schedules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Parents can insert class schedules" ON public.class_schedules
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'parent'));

CREATE POLICY "Parents can delete class schedules" ON public.class_schedules
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'parent'));

-- Class entries table (details logged per class date)
CREATE TABLE public.class_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_name text NOT NULL,
  date date NOT NULL,
  topics_covered text DEFAULT '',
  homework text DEFAULT '',
  notes text DEFAULT '',
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_name, date)
);

ALTER TABLE public.class_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read class entries" ON public.class_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert class entries" ON public.class_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own class entries" ON public.class_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
