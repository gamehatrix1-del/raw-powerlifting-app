-- Weekly job that calls the at-risk-digest Edge Function via pg_net,
-- reusing the same shared secret already stored in Vault for
-- renewal-reminders (see migration 0011) rather than creating a new one.
select cron.schedule(
  'send-at-risk-digest',
  '0 8 * * 1', -- every Monday at 08:00 UTC
  $$
  select net.http_post(
    url := 'https://ysjcrvrkmdqxrhecrkxh.supabase.co/functions/v1/at-risk-digest',
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
