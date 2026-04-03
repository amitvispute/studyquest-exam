
-- Allow users to delete their own class entries
CREATE POLICY "Users can delete own class entries"
  ON class_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
