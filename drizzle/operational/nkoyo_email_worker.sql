-- Run after deploying the automatic email worker and storing its matching
-- CRON_SECRET in Supabase Vault as nkoyo_email_worker. No credentials live here.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'nkoyo_email_worker') THEN
    RAISE EXCEPTION 'Store the matching production worker credential in Vault first';
  END IF;
END $$;

-- A named job is updated on rerun instead of creating duplicate workers.
SELECT cron.schedule(
  'nkoyo-automatic-emails', '* * * * *',
  $worker$
  SELECT net.http_get(
    url := 'https://nkoyo-snapshot.vercel.app/api/email-jobs',
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'nkoyo_email_worker')),
    timeout_milliseconds := 250000
  );
  $worker$
);
