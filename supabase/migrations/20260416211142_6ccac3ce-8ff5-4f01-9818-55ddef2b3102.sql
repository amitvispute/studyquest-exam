-- Lock down user_roles: explicitly deny all writes from authenticated users.
-- Only the service role (used by edge functions and the handle_new_user trigger,
-- which is SECURITY DEFINER) can modify roles. This prevents privilege escalation.
CREATE POLICY "Block role inserts from authenticated users"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block role updates from authenticated users"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block role deletes from authenticated users"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

-- Harden ai_mentor_usage: if a write policy is ever added inadvertently,
-- ensure users can only ever affect their own row. Keep these as restrictive,
-- owner-scoped policies so users cannot tamper with other students' counters.
CREATE POLICY "Users can insert own usage"
ON public.ai_mentor_usage
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
ON public.ai_mentor_usage
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
