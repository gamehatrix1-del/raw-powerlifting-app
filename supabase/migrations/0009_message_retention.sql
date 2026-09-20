-- Chat messages are transient, not records that need to be kept forever —
-- auto-delete anything older than 7 days so the table doesn't grow
-- unbounded. Runs daily via pg_cron; the retention period is also
-- surfaced to users in ChatScreen so it's not a surprise.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'delete-old-messages',
  '0 3 * * *', -- daily at 03:00 UTC
  $$ delete from messages where created_at < now() - interval '7 days'; $$
);
