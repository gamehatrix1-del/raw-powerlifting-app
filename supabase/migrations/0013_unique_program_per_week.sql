-- A coach could previously assign two separate programs to the same
-- athlete for the same week (confirmed already happened for 3 athletes in
-- production data), leaving it undefined which one the athlete's Home/
-- Program screens would show. Clean up the existing duplicates — keeping
-- the most recently created program per athlete+week, since that's the
-- one the coach most likely intended as final — then make it impossible
-- to create another one going forward.
--
-- Deleting the older duplicate cascades to its program_days and
-- program_exercises, but NOT to the athlete's actual workout_logs: that
-- FK is `on delete set null` (see migration 0001), so any sets the
-- athlete already logged against the removed program are preserved,
-- just detached from the deleted program_exercise reference.
with ranked as (
  select id, row_number() over (
    partition by athlete_id, week_start_date
    order by created_at desc, id desc
  ) as rn
  from programs
)
delete from programs
where id in (select id from ranked where rn > 1);

alter table programs
  add constraint programs_athlete_week_unique unique (athlete_id, week_start_date);
