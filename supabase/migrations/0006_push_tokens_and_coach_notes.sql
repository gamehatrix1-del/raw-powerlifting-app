-- Expo push token per user, so server-side functions (new program
-- assigned, payment failed) can notify the right device.
alter table profiles
  add column push_token text;

-- Lets a coach leave feedback on a specific logged set, not just view it.
alter table workout_logs
  add column coach_note text,
  add column coach_note_at timestamptz;

-- workout_logs was athlete-managed / coach-read-only until now; coaches
-- need write access scoped to just leaving feedback. RLS can't restrict
-- to individual columns, so this grants coaches update on the row — an
-- acceptable trust boundary given coaches already have full read access
-- to every athlete's training data in this app.
create policy "workout_logs_update_coach" on workout_logs
  for update using (public.is_coach()) with check (public.is_coach());
