BEGIN;

CREATE TABLE public.website_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('page','blog','video','webinar','resource','popup')),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title text NOT NULL CHECK (length(title) <= 160),
  draft jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(draft)='object'),
  published jsonb CHECK (published IS NULL OR jsonb_typeof(published)='object'),
  revision bigint NOT NULL DEFAULT 0,
  published_revision bigint NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  source_ref text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  updated_by uuid,
  UNIQUE(kind,slug), UNIQUE(kind,source_ref),
  CHECK (kind <> 'page' OR (slug='home' AND id='00000000-0000-4000-8000-000000000001'))
);
CREATE UNIQUE INDEX website_one_featured_webinar ON public.website_documents ((published->>'featured'))
  WHERE kind='webinar' AND published IS NOT NULL AND published->>'featured'='true' AND NOT archived;

CREATE TABLE public.website_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.website_documents(id),
  revision bigint NOT NULL, title text NOT NULL, slug text NOT NULL,
  content jsonb NOT NULL, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), actor_id uuid NOT NULL,
  UNIQUE(document_id,revision)
);
CREATE TABLE public.website_integrations (
  key text PRIMARY KEY CHECK(key='kit_posts'), payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_success_at timestamptz, last_attempt_at timestamptz, last_error text
);
CREATE TABLE public.website_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), object_path text NOT NULL UNIQUE,
  filename text NOT NULL, byte_size integer NOT NULL CHECK(byte_size>0 AND byte_size<=10485760),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','rejected')),
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.website_content_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.website_documents(id),
  event_key text NOT NULL UNIQUE CHECK(length(event_key)<=160),
  event_type text NOT NULL CHECK(event_type IN ('cta_click','resource_access','registration_form_opened','popup_impression','popup_dismissal','popup_click')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX website_content_recent ON public.website_documents(kind,updated_at DESC);
CREATE INDEX website_content_events_by_document ON public.website_content_events(document_id,created_at DESC);

ALTER TABLE public.website_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_content_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.website_documents,public.website_versions,public.website_integrations,public.website_assets,public.website_content_events FROM anon,authenticated;
GRANT SELECT ON public.website_documents,public.website_versions,public.website_integrations,public.website_assets,public.website_content_events TO authenticated;
GRANT ALL ON public.website_documents,public.website_versions,public.website_integrations,public.website_assets,public.website_content_events TO service_role;
CREATE POLICY "Administrators read website documents" ON public.website_documents FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators read website versions" ON public.website_versions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators read website integrations" ON public.website_integrations FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators read website assets" ON public.website_assets FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators read website events" ON public.website_content_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

-- All writes enter through authenticated server functions. This RPC provides one
-- transaction for optimistic concurrency, versioning and the publication pointer.
CREATE FUNCTION public.website_mutate_document(
  p_actor uuid,p_id uuid,p_kind text,p_slug text,p_title text,p_draft jsonb,
  p_expected bigint,p_action text,p_restore uuid DEFAULT NULL,p_source_ref text DEFAULT NULL
) RETURNS public.website_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.website_documents; v public.website_versions; next_revision bigint;
BEGIN
  IF NOT public.has_role(p_actor,'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_action NOT IN ('save','publish','unpublish','archive','restore') THEN RAISE EXCEPTION 'Invalid content action'; END IF;
  SELECT * INTO d FROM public.website_documents WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN
    IF p_expected<>0 OR p_action NOT IN ('save','publish') THEN RAISE EXCEPTION 'Content no longer exists'; END IF;
    INSERT INTO public.website_documents(id,kind,slug,title,draft,source_ref) VALUES(p_id,p_kind,p_slug,p_title,p_draft,p_source_ref) RETURNING * INTO d;
  END IF;
  IF d.kind<>p_kind OR d.revision<>p_expected THEN RAISE EXCEPTION 'Content changed. Reload before saving'; END IF;
  IF d.published_revision>0 AND d.slug<>p_slug THEN RAISE EXCEPTION 'A previously published slug cannot be changed'; END IF;
  next_revision:=d.revision+1;
  IF p_action='restore' THEN
    SELECT * INTO v FROM public.website_versions WHERE id=p_restore AND document_id=d.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Published version not found'; END IF;
    UPDATE public.website_documents SET draft=v.content,title=v.title,archived=false,revision=next_revision,updated_at=now(),updated_by=p_actor WHERE id=d.id RETURNING * INTO d;
  ELSIF p_action IN ('save','publish') THEN
    UPDATE public.website_documents SET slug=p_slug,title=p_title,draft=p_draft,archived=false,revision=next_revision,
      published=CASE WHEN p_action='publish' THEN p_draft ELSE published END,
      published_at=CASE WHEN p_action='publish' THEN now() ELSE published_at END,
      published_revision=CASE WHEN p_action='publish' THEN next_revision ELSE published_revision END,
      updated_at=now(),updated_by=p_actor WHERE id=d.id RETURNING * INTO d;
    IF p_action='publish' THEN
      INSERT INTO public.website_versions(document_id,revision,title,slug,content,action,actor_id) VALUES(d.id,next_revision,p_title,p_slug,p_draft,'publish',p_actor);
    END IF;
  ELSE
    IF d.published IS NOT NULL THEN
      INSERT INTO public.website_versions(document_id,revision,title,slug,content,action,actor_id) VALUES(d.id,next_revision,d.title,d.slug,d.published,p_action,p_actor);
    END IF;
    UPDATE public.website_documents SET published=NULL,archived=(p_action='archive'),revision=next_revision,updated_at=now(),updated_by=p_actor WHERE id=d.id RETURNING * INTO d;
  END IF;
  RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.website_mutate_document(uuid,uuid,text,text,text,jsonb,bigint,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.website_mutate_document(uuid,uuid,text,text,text,jsonb,bigint,text,uuid,text) TO service_role;

-- Private persistent storage. No anonymous object-read or upload policies.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('website-resources','website-resources',false,10485760,ARRAY['application/pdf']) ON CONFLICT(id) DO NOTHING;

NOTIFY pgrst,'reload schema';
COMMIT;
