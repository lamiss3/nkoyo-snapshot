BEGIN;
CREATE TABLE public.staff_account_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  target_id uuid,
  email text NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.staff_account_deletions (
  target_id uuid PRIMARY KEY,
  email text NOT NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','failed','deleted')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.staff_account_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_account_deletions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.staff_account_events, public.staff_account_deletions TO authenticated;
GRANT ALL ON public.staff_account_events, public.staff_account_deletions TO service_role;
CREATE POLICY "Administrators read staff account history" ON public.staff_account_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators read account deletion progress" ON public.staff_account_deletions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Revoke access in one serialized transaction before deleting the Auth identity.
-- Unexpired access tokens cannot continue reading staff data after role revocation.
CREATE FUNCTION public.begin_staff_account_deletion(p_actor uuid,p_target uuid,p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE previous public.staff_account_deletions;
BEGIN
  LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;
  IF NOT public.has_role(p_actor,'admin') THEN RAISE EXCEPTION 'Administrator access is required'; END IF;
  IF p_actor=p_target THEN RAISE EXCEPTION 'You cannot delete your own account'; END IF;
  SELECT * INTO previous FROM public.staff_account_deletions WHERE target_id=p_target;
  IF FOUND THEN
    IF previous.email <> p_email OR previous.status='deleted' THEN RAISE EXCEPTION 'Invalid deletion request'; END IF;
    UPDATE public.staff_account_deletions SET status='pending' WHERE target_id=p_target;
    RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_target) THEN RAISE EXCEPTION 'Staff account not found'; END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_target AND lower(email)=p_email) THEN RAISE EXCEPTION 'Email confirmation does not match'; END IF;
  IF public.has_role(p_target,'admin') AND (SELECT count(*) FROM public.user_roles WHERE role='admin') <= 1 THEN
    RAISE EXCEPTION 'The last administrator cannot be deleted';
  END IF;
  INSERT INTO public.staff_account_deletions(target_id,email,requested_by) VALUES(p_target,p_email,p_actor);
  DELETE FROM public.user_roles WHERE user_id=p_target;
  INSERT INTO public.staff_account_events(actor_id,target_id,email,event_type) VALUES(p_actor,p_target,p_email,'deletion_requested_access_revoked');
END $$;
REVOKE ALL ON FUNCTION public.begin_staff_account_deletion(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_staff_account_deletion(uuid,uuid,text) TO service_role;
CREATE FUNCTION public.grant_new_staff_account(p_actor uuid,p_target uuid,p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;
  IF NOT public.has_role(p_actor,'admin') THEN RAISE EXCEPTION 'Administrator access is required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_target AND lower(email)=p_email) THEN RAISE EXCEPTION 'Account email does not match'; END IF;
  IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_target) THEN RAISE EXCEPTION 'This account already has access'; END IF;
  INSERT INTO public.user_roles(user_id,role) VALUES(p_target,'staff');
  INSERT INTO public.staff_account_events(actor_id,target_id,email,event_type) VALUES(p_actor,p_target,p_email,'staff_created');
END $$;
REVOKE ALL ON FUNCTION public.grant_new_staff_account(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.grant_new_staff_account(uuid,uuid,text) TO service_role;
COMMIT;
