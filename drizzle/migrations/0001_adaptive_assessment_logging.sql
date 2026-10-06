BEGIN;

CREATE TABLE IF NOT EXISTS public.adaptive_assessment_traces (
  session_id uuid PRIMARY KEY,
  token_hash text NOT NULL,
  version text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('opening','probes','bridge','finalists','complete')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','restarted','error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error jsonb
);

CREATE TABLE IF NOT EXISTS public.adaptive_assessment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.adaptive_assessment_traces(session_id) ON DELETE CASCADE,
  event_key text NOT NULL,
  attempt_id uuid,
  source text NOT NULL CHECK (source IN ('browser','server')),
  event_type text NOT NULL,
  stage text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(session_id, event_key)
);

CREATE TABLE IF NOT EXISTS public.adaptive_model_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.adaptive_assessment_traces(session_id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('jev','gemini')),
  operation text NOT NULL,
  configured_model text NOT NULL,
  response_model text,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','succeeded','failed')),
  request jsonb NOT NULL,
  response jsonb,
  output jsonb,
  usage jsonb,
  http_status integer,
  duration_ms integer,
  error jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS adaptive_trace_recent ON public.adaptive_assessment_traces(updated_at DESC);
CREATE INDEX IF NOT EXISTS adaptive_event_timeline ON public.adaptive_assessment_events(session_id, recorded_at);
CREATE INDEX IF NOT EXISTS adaptive_call_timeline ON public.adaptive_model_calls(session_id, started_at);

ALTER TABLE public.adaptive_assessment_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_assessment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_model_calls ENABLE ROW LEVEL SECURITY;

-- No public read/write permission: all writes originate from server functions.
REVOKE ALL ON public.adaptive_assessment_traces, public.adaptive_assessment_events, public.adaptive_model_calls FROM anon, authenticated;
GRANT SELECT ON public.adaptive_assessment_traces, public.adaptive_assessment_events, public.adaptive_model_calls TO authenticated;
GRANT ALL ON public.adaptive_assessment_traces, public.adaptive_assessment_events, public.adaptive_model_calls TO service_role;

DROP POLICY IF EXISTS "Staff read assessment traces" ON public.adaptive_assessment_traces;
CREATE POLICY "Staff read assessment traces" ON public.adaptive_assessment_traces FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "Staff read assessment events" ON public.adaptive_assessment_events;
CREATE POLICY "Staff read assessment events" ON public.adaptive_assessment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "Staff read model calls" ON public.adaptive_model_calls;
CREATE POLICY "Staff read model calls" ON public.adaptive_model_calls FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

NOTIFY pgrst, 'reload schema';
COMMIT;
