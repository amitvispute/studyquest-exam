
-- 1. Create trigger function to compute is_correct server-side
CREATE OR REPLACE FUNCTION public.compute_is_correct()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT (NEW.student_answer = q.correct_answer)
  INTO NEW.is_correct
  FROM public.ai_mock_questions q
  WHERE q.id = NEW.question_id;
  
  -- If question not found, default to false
  IF NEW.is_correct IS NULL THEN
    NEW.is_correct := false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Create BEFORE INSERT trigger on ai_mock_answers
CREATE TRIGGER trg_compute_is_correct
BEFORE INSERT ON public.ai_mock_answers
FOR EACH ROW
EXECUTE FUNCTION public.compute_is_correct();

-- 3. Create increment_mentor_usage RPC (only adds 1, never decrements)
CREATE OR REPLACE FUNCTION public.increment_mentor_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := CURRENT_DATE;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.ai_mentor_usage (user_id, date, message_count)
  VALUES (_user_id, _today, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET message_count = ai_mentor_usage.message_count + 1;
END;
$$;

-- 4. Drop the student UPDATE and INSERT policies on ai_mentor_usage
DROP POLICY IF EXISTS "Students can update own usage" ON public.ai_mentor_usage;
DROP POLICY IF EXISTS "Students can insert own usage" ON public.ai_mentor_usage;

-- 5. Add unique constraint for upsert to work
ALTER TABLE public.ai_mentor_usage ADD CONSTRAINT ai_mentor_usage_user_date_unique UNIQUE (user_id, date);
