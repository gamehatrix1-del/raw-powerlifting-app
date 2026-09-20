-- Ongoing bodyweight trend, separate from the one-time intake snapshot
-- (athlete_profiles.bodyweight_kg). One entry per athlete per day — logging
-- again the same day updates that day's entry instead of duplicating it.
create table bodyweight_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles (id) on delete cascade,
  weight_kg numeric not null,
  logged_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (athlete_id, logged_at)
);

create index bodyweight_logs_athlete_id_idx on bodyweight_logs (athlete_id, logged_at);

alter table bodyweight_logs enable row level security;

create policy "bodyweight_logs_select" on bodyweight_logs
  for select using (athlete_id = auth.uid() or public.is_coach());

create policy "bodyweight_logs_insert_own" on bodyweight_logs
  for insert with check (athlete_id = auth.uid());

create policy "bodyweight_logs_update_own" on bodyweight_logs
  for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

create policy "bodyweight_logs_delete_own" on bodyweight_logs
  for delete using (athlete_id = auth.uid());
