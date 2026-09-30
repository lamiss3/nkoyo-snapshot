-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Assessment sessions
CREATE TABLE public.assessment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  followup_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary_key text
);
GRANT INSERT ON public.assessment_sessions TO anon, authenticated;
GRANT SELECT ON public.assessment_sessions TO authenticated;
GRANT ALL ON public.assessment_sessions TO service_role;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a completed snapshot" ON public.assessment_sessions
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can read snapshots" ON public.assessment_sessions
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text,
  first_name text NOT NULL,
  email text NOT NULL,
  organization text,
  role_title text,
  challenge text,
  marketing_consent boolean NOT NULL DEFAULT false,
  marketing_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead" ON public.leads
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can read leads" ON public.leads
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Events (booking CTA clicks, starts, completions)
CREATE TABLE public.snapshot_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.snapshot_events TO anon, authenticated;
GRANT SELECT ON public.snapshot_events TO authenticated;
GRANT ALL ON public.snapshot_events TO service_role;
ALTER TABLE public.snapshot_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log an event" ON public.snapshot_events
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can read events" ON public.snapshot_events
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));