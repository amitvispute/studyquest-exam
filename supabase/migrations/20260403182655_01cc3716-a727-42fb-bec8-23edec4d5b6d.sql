
-- 1. Fix class_entries: replace broad SELECT with owner + parent policies
DROP POLICY "Authenticated users can read class entries" ON class_entries;

CREATE POLICY "Users can read own class entries"
  ON class_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Parents can read all class entries"
  ON class_entries FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'parent'::app_role));

-- 2. Fix class_schedules: replace broad SELECT with owner + parent policies
DROP POLICY "Authenticated users can read class schedules" ON class_schedules;

CREATE POLICY "Users can read own class schedules"
  ON class_schedules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Parents can read all class schedules"
  ON class_schedules FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'parent'::app_role));

-- 3. Fix user_roles: remove self-insert policy (handle_new_user trigger uses SECURITY DEFINER, bypasses RLS)
DROP POLICY "Service role can insert roles" ON user_roles;

-- 4. Add UPDATE/DELETE policies for daily_logs (owner only)
CREATE POLICY "Users can update own daily logs"
  ON daily_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily logs"
  ON daily_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Add UPDATE/DELETE policies for mock_exams (owner only)
CREATE POLICY "Users can update own mock exams"
  ON mock_exams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mock exams"
  ON mock_exams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
