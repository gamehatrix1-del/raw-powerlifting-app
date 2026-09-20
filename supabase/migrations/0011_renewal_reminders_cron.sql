-- Daily job that calls the renewal-reminders Edge Function via pg_net.
-- Authenticates with a shared secret pulled from Supabase Vault at call
-- time (stored out-of-band via `vault.create_secret`, never committed
-- here) rather than embedding any credential in this migration.
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-renewal-reminders',
  '0 9 * * *', -- daily at 09:00 UTC
  $$
  select net.http_post(
    url := 'https://ysjcrvrkmdqxrhecrkxh.supabase.co/functions/v1/renewal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'renewal_reminders_cron_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
