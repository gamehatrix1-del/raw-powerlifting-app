-- ============================================================
-- invite_codes — gates athlete signup so this stays a private,
-- coach-run business rather than an open public app.
-- ============================================================

create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references profiles (id),
  used_by uuid references profiles (id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table invite_codes enable row level security;

create policy "invite_codes_coach_all" on invite_codes
  for all using (public.is_coach()) with check (public.is_coach());

-- Athlete signups must supply a valid, unused invite code. This runs
-- inside the same transaction as the auth.users insert (security definer,
-- so it bypasses RLS to check/consume the code), so an invalid code aborts
-- account creation entirely rather than relying on a client-side check
-- that a modified client could skip.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role user_role;
  v_code text;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'athlete');
  v_code := new.raw_user_meta_data ->> 'invite_code';

  if v_role = 'athlete' then
    if v_code is null or length(trim(v_code)) = 0 then
      raise exception 'An invite code is required to sign up.';
    end if;

    update public.invite_codes
      set used_by = new.id, used_at = now()
      where code = upper(trim(v_code)) and used_at is null;

    if not found then
      raise exception 'That invite code is invalid or has already been used.';
    end if;
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- messages — a single running thread per athlete (athlete <-> coach).
-- ============================================================

create table messages (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_athlete_id_created_at_idx on messages (athlete_id, created_at);

alter table messages enable row level security;

create policy "messages_select" on messages
  for select using (athlete_id = auth.uid() or public.is_coach());

create policy "messages_insert" on messages
  for insert with check (
    sender_id = auth.uid() and (athlete_id = auth.uid() or public.is_coach())
  );

create policy "messages_update_read" on messages
  for update using (athlete_id = auth.uid() or public.is_coach())
  with check (athlete_id = auth.uid() or public.is_coach());

alter publication supabase_realtime add table messages;

-- ============================================================
-- program_templates — coach-saved workouts, reusable across athletes.
-- ============================================================

create table program_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table program_template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references program_templates (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 7),
  day_label text not null,
  is_rest_day boolean not null default false
);

create table program_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_day_id uuid not null references program_template_days (id) on delete cascade,
  exercise_id uuid not null references exercises (id),
  order_index smallint not null default 0,
  sets smallint not null default 1,
  reps text not null default '-',
  target_load text,
  target_rpe numeric,
  tempo_note text
);

create index program_template_days_template_id_idx on program_template_days (template_id);
create index program_template_exercises_day_id_idx on program_template_exercises (template_day_id);

alter table program_templates enable row level security;
alter table program_template_days enable row level security;
alter table program_template_exercises enable row level security;

create policy "program_templates_coach_own" on program_templates
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "program_template_days_coach_own" on program_template_days
  for all using (
    exists (select 1 from program_templates t where t.id = template_id and t.coach_id = auth.uid())
  ) with check (
    exists (select 1 from program_templates t where t.id = template_id and t.coach_id = auth.uid())
  );

create policy "program_template_exercises_coach_own" on program_template_exercises
  for all using (
    exists (
      select 1 from program_template_days d
      join program_templates t on t.id = d.template_id
      where d.id = template_day_id and t.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from program_template_days d
      join program_templates t on t.id = d.template_id
      where d.id = template_day_id and t.coach_id = auth.uid()
    )
  );
