-- Durable, private email preparation. No customer email is sent by this migration.
BEGIN;
CREATE TABLE public.email_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.adaptive_assessment_traces(session_id),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  email text NOT NULL,
  followup_consent boolean NOT NULL,
  consent_version text NOT NULL DEFAULT 'personalized-five-emails-v1',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','generating','draft','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lock_token uuid,
  locked_until timestamptz,
  content jsonb,
  kit_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_journeys_queue ON public.email_journeys(status,next_attempt_at);
CREATE TABLE public.email_journey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.email_journeys(id),
  event_type text NOT NULL,
  actor_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_journey_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_journeys, public.email_journey_events FROM anon, authenticated;
GRANT SELECT ON public.email_journeys, public.email_journey_events TO authenticated;
GRANT ALL ON public.email_journeys, public.email_journey_events TO service_role;
CREATE POLICY "Staff read email journeys" ON public.email_journeys FOR SELECT TO authenticated
 USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Staff read email events" ON public.email_journey_events FOR SELECT TO authenticated
 USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

-- Serialize per assessment, so retrying a form cannot create duplicate leads/jobs.
CREATE FUNCTION public.enqueue_email_journey(p_session uuid,p_email text,p_consent boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing public.email_journeys; new_lead uuid; new_job uuid;
BEGIN
 PERFORM 1 FROM public.adaptive_assessment_traces WHERE session_id=p_session AND status='completed' AND stage='complete' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'A completed assessment is required'; END IF;
 SELECT * INTO existing FROM public.email_journeys WHERE session_id=p_session;
 IF FOUND THEN
  IF existing.email <> p_email THEN RAISE EXCEPTION 'A report request already exists for this assessment'; END IF;
  RETURN existing.id;
 END IF;
 INSERT INTO public.leads(session_key,first_name,email,marketing_consent,marketing_consent_at)
 VALUES (p_session::text,'',p_email,p_consent,CASE WHEN p_consent THEN now() ELSE NULL END) RETURNING id INTO new_lead;
 INSERT INTO public.email_journeys(session_id,lead_id,email,followup_consent)
 VALUES(p_session,new_lead,p_email,p_consent) RETURNING id INTO new_job;
 INSERT INTO public.email_journey_events(journey_id,event_type,details)
 VALUES(new_job,'requested',jsonb_build_object('followupConsent',p_consent,'consentVersion','personalized-five-emails-v1'));
 RETURN new_job;
END $$;

-- A three-minute lease exceeds the Gemini timeout. Lock tokens fence late workers.
CREATE OR REPLACE FUNCTION public.claim_email_journey(p_id uuid DEFAULT NULL,p_retry boolean DEFAULT false)
RETURNS SETOF public.email_journeys LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE chosen uuid;
BEGIN
 UPDATE public.email_journeys SET status='failed',lock_token=NULL,locked_until=NULL,
  last_error='Generation was interrupted after three attempts. Staff can retry.',updated_at=now()
 WHERE status='generating' AND locked_until < now() AND attempts>=3;
 SELECT id INTO chosen FROM public.email_journeys
 WHERE (p_id IS NULL OR id=p_id) AND content IS NULL AND status <> 'cancelled'
 AND (locked_until IS NULL OR locked_until < now())
 AND ((status='queued' AND (next_attempt_at <= now() OR (p_retry AND p_id IS NOT NULL))) OR status='generating'
      OR (status='failed' AND p_retry AND p_id IS NOT NULL))
 AND (attempts < 3 OR (p_retry AND p_id IS NOT NULL))
 ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF chosen IS NULL THEN RETURN; END IF;
 RETURN QUERY UPDATE public.email_journeys SET status='generating',attempts=attempts+1,
  lock_token=gen_random_uuid(),locked_until=now()+interval '3 minutes',updated_at=now(),last_error=NULL
  WHERE id=chosen RETURNING *;
END $$;

CREATE FUNCTION public.finish_email_journey(p_id uuid,p_lock uuid,p_content jsonb,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE job public.email_journeys;
BEGIN
 SELECT * INTO job FROM public.email_journeys WHERE id=p_id AND lock_token=p_lock AND status='generating' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_content IS NOT NULL AND (jsonb_array_length(p_content->'emails') <> 5 OR p_content->>'sessionId' <> job.session_id::text) THEN
  RAISE EXCEPTION 'Invalid email journey';
 END IF;
 UPDATE public.email_journeys SET content=p_content,
  status=CASE WHEN p_content IS NOT NULL THEN 'draft' WHEN attempts<3 THEN 'queued' ELSE 'failed' END,
  next_attempt_at=now()+interval '15 minutes',last_error=p_error,
  lock_token=NULL,locked_until=NULL,updated_at=now() WHERE id=p_id;
 INSERT INTO public.email_journey_events(journey_id,event_type,details)
 VALUES(p_id,CASE WHEN p_content IS NOT NULL THEN 'drafts_generated' ELSE 'generation_failed' END,
 jsonb_build_object('attempt',job.attempts,'error',p_error));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_email_journey(uuid,text,boolean),public.claim_email_journey(uuid,boolean),public.finish_email_journey(uuid,uuid,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email_journey(uuid,text,boolean),public.claim_email_journey(uuid,boolean),public.finish_email_journey(uuid,uuid,jsonb,text) TO service_role;
COMMIT;
