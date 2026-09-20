-- Exercises can't actually be deleted once used anywhere (program_exercises,
-- program_template_exercises, and workout_logs.exercise_id all reference
-- exercises with no ON DELETE clause, so Postgres blocks it) — confirmed
-- the coach's "Delete" button was surfacing a raw foreign-key-violation
-- error instead of failing gracefully. Same soft-delete pattern already
-- used for plans.is_active: retiring an exercise hides it from new
-- program-building without touching any historical reference to it.
alter table exercises
  add column is_active boolean not null default true;
