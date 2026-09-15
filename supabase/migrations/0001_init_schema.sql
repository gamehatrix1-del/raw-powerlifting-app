-- RAW@ Powerlifting Academy — initial schema
-- Tables per build guide section 6.2: users, athlete_profiles, programs,
-- program_days, exercises, workout_logs, plans, payments.
-- (program_exercises added as the join between program_days and exercises —
-- needed to represent each exercise card within a day.)

-- ============================================================
-- Enums
-- ============================================================

create type user_role as enum ('athlete', 'coach');
create type exercise_category as enum ('strength', 'cardio', 'mobility');
create type program_status as enum ('draft', 'active', 'completed');
create type plan_interval as enum ('monthly', 'quarterly', 'yearly');
create type payment_status as enum ('created', 'paid', 'failed', 'refunded');

-- ============================================================
-- profiles — one row per auth user, adds role on top of Supabase auth
-- ============================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'athlete',
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'athlete')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used throughout RLS policies below.
create function public.is_coach()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'coach'
  );
$$ language sql stable security definer set search_path = public;

-- ============================================================
-- athlete_profiles — intake data, one per athlete
-- ============================================================

create table athlete_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  squat_1rm numeric,
  bench_1rm numeric,
  deadlift_1rm numeric,
  squat_style text,
  equipment_access text,
  injuries_notes text,
  recovery_notes text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- exercises — shared library used by every program
-- ============================================================

create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category exercise_category not null,
  demo_video_url text,
  cue_text text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- programs — a week assigned to an athlete by a coach
-- ============================================================

create table programs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles (id) on delete cascade,
  coach_id uuid not null references profiles (id),
  name text not null,
  week_start_date date not null,
  status program_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index programs_athlete_id_idx on programs (athlete_id);
create index programs_coach_id_idx on programs (coach_id);

-- ============================================================
-- program_days — Day 1..7 within a program
-- ============================================================

create table program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 7),
  day_label text not null,
  is_rest_day boolean not null default false,
  unique (program_id, day_number)
);

-- ============================================================
-- program_exercises — each exercise card within a program day
-- ============================================================

create table program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days (id) on delete cascade,
  exercise_id uuid not null references exercises (id),
  order_index smallint not null default 0,
  sets smallint not null,
  reps text not null,
  target_load text,
  target_rpe numeric(3, 1),
  tempo_note text
);

create index program_exercises_program_day_id_idx on program_exercises (program_day_id);

-- ============================================================
-- workout_logs — actual performance logged by the athlete, per set
-- ============================================================

create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles (id) on delete cascade,
  program_exercise_id uuid references program_exercises (id) on delete set null,
  exercise_id uuid not null references exercises (id),
  logged_at timestamptz not null default now(),
  set_number smallint not null,
  weight numeric,
  reps smallint,
  rpe numeric(3, 1),
  notes text
);

create index workout_logs_athlete_id_idx on workout_logs (athlete_id);
create index workout_logs_exercise_id_idx on workout_logs (athlete_id, exercise_id);

-- ============================================================
-- plans — membership plans available for purchase
-- ============================================================

create table plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_inr numeric not null,
  billing_interval plan_interval not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- payments — Razorpay transactions
-- ============================================================

create table payments (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles (id) on delete cascade,
  plan_id uuid not null references plans (id),
  razorpay_order_id text,
  razorpay_payment_id text,
  amount_inr numeric not null,
  status payment_status not null default 'created',
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index payments_athlete_id_idx on payments (athlete_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table athlete_profiles enable row level security;
alter table exercises enable row level security;
alter table programs enable row level security;
alter table program_days enable row level security;
alter table program_exercises enable row level security;
alter table workout_logs enable row level security;
alter table plans enable row level security;
alter table payments enable row level security;

-- profiles: everyone can see their own row; coaches can see everyone's.
create policy "profiles_select_own_or_coach" on profiles
  for select using (id = auth.uid() or public.is_coach());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- athlete_profiles: athlete manages their own; coach can read all.
create policy "athlete_profiles_select" on athlete_profiles
  for select using (user_id = auth.uid() or public.is_coach());
create policy "athlete_profiles_insert_own" on athlete_profiles
  for insert with check (user_id = auth.uid());
create policy "athlete_profiles_update_own" on athlete_profiles
  for update using (user_id = auth.uid());

-- exercises: readable by any signed-in user; only coaches manage the library.
create policy "exercises_select_all" on exercises
  for select using (auth.uid() is not null);
create policy "exercises_write_coach" on exercises
  for all using (public.is_coach()) with check (public.is_coach());

-- programs: athlete reads their own; coach reads/writes programs they own.
create policy "programs_select" on programs
  for select using (athlete_id = auth.uid() or coach_id = auth.uid());
create policy "programs_write_coach" on programs
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- program_days / program_exercises follow the parent program's visibility.
create policy "program_days_select" on program_days
  for select using (
    exists (
      select 1 from programs p
      where p.id = program_days.program_id
        and (p.athlete_id = auth.uid() or p.coach_id = auth.uid())
    )
  );
create policy "program_days_write_coach" on program_days
  for all using (
    exists (
      select 1 from programs p
      where p.id = program_days.program_id and p.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from programs p
      where p.id = program_days.program_id and p.coach_id = auth.uid()
    )
  );

create policy "program_exercises_select" on program_exercises
  for select using (
    exists (
      select 1 from program_days d
      join programs p on p.id = d.program_id
      where d.id = program_exercises.program_day_id
        and (p.athlete_id = auth.uid() or p.coach_id = auth.uid())
    )
  );
create policy "program_exercises_write_coach" on program_exercises
  for all using (
    exists (
      select 1 from program_days d
      join programs p on p.id = d.program_id
      where d.id = program_exercises.program_day_id and p.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from program_days d
      join programs p on p.id = d.program_id
      where d.id = program_exercises.program_day_id and p.coach_id = auth.uid()
    )
  );

-- workout_logs: athlete manages their own; coach reads all (read-only).
create policy "workout_logs_select" on workout_logs
  for select using (athlete_id = auth.uid() or public.is_coach());
create policy "workout_logs_insert_own" on workout_logs
  for insert with check (athlete_id = auth.uid());
create policy "workout_logs_update_own" on workout_logs
  for update using (athlete_id = auth.uid());

-- plans: any signed-in user can see active plans; only coaches manage them.
create policy "plans_select_active" on plans
  for select using (is_active or public.is_coach());
create policy "plans_write_coach" on plans
  for all using (public.is_coach()) with check (public.is_coach());

-- payments: athlete reads their own; coach reads all.
-- Inserts/updates are intentionally left to the service role only (the
-- Razorpay webhook Edge Function), so no authenticated-role write policy
-- exists here — the client never writes payment rows directly.
create policy "payments_select" on payments
  for select using (athlete_id = auth.uid() or public.is_coach());
