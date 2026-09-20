-- Tracks whether a renewal-due reminder has already been sent for a given
-- payment cycle, so the daily cron job doesn't re-notify the athlete every
-- day their renewal stays "coming up soon."
alter table payments
  add column renewal_reminder_sent_at timestamptz;
