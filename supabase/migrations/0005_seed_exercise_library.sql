-- Seeds a real starter exercise library so a brand-new coach account isn't
-- a blank slate: without exercises to pick from, ProgramBuilder has
-- nothing to assign, athletes have nothing to log, and Progress/charts
-- have nothing to plot. Guarded per-row with NOT EXISTS so this is safe
-- to run even if a coach already added exercises with the same name.

insert into exercises (name, category, cue_text)
select v.name, v.category::exercise_category, v.cue_text
from (values
  ('Barbell Back Squat', 'strength', 'Brace your core before unracking. Break at the hips and knees together, drive through mid-foot.'),
  ('Barbell Front Squat', 'strength', 'Keep elbows high through the whole rep to stop the bar rolling forward.'),
  ('Barbell Bench Press', 'strength', 'Set your arch, retract the shoulder blades, and keep feet driving into the floor.'),
  ('Close-Grip Bench Press', 'strength', 'Elbows tucked closer than a competition bench grip — targets triceps lockout.'),
  ('Conventional Deadlift', 'strength', 'Bar over mid-foot, take the slack out of the bar before pulling.'),
  ('Sumo Deadlift', 'strength', 'Wide stance, chest tall, push the floor away rather than pulling with the back.'),
  ('Romanian Deadlift', 'strength', 'Soft knees, hinge at the hips, keep the bar tracking close to the legs.'),
  ('Overhead Press', 'strength', 'Squeeze glutes and abs to avoid over-arching the lower back.'),
  ('Barbell Row', 'strength', 'Pull to the lower ribs, control the lowering — no jerking the weight up.'),
  ('Pull-Up', 'strength', 'Full hang at the bottom, chin clears the bar at the top.'),
  ('Leg Press', 'strength', 'Full range of motion without letting the lower back round off the pad.'),
  ('Walking Lunge', 'strength', 'Front knee tracks over the toes, torso stays tall.'),
  ('Barbell Hip Thrust', 'strength', 'Drive through the heels, squeeze glutes hard at the top.'),
  ('Rowing Machine', 'cardio', 'Legs, then hips, then arms on the drive — reverse the order on the recovery.'),
  ('Stationary Bike', 'cardio', 'Keep a steady cadence rather than surging — easier to hold pace targets.'),
  ('Jump Rope', 'cardio', 'Small hops, wrists doing the work rather than the whole arm.'),
  ('Hip Mobility Flow', 'mobility', '5-10 minutes of controlled hip circles, 90/90s, and a deep lunge stretch.'),
  ('Shoulder Dislocates', 'mobility', 'Use a band or PVC pipe, keep arms straight, go only as far as feels controlled.'),
  ('Ankle Dorsiflexion Stretch', 'mobility', 'Knee drives past the toes while the heel stays flat on the floor.'),
  ('Foam Rolling', 'mobility', 'Slow, controlled passes — pause on tender spots for 20-30 seconds.')
) as v(name, category, cue_text)
where not exists (
  select 1 from exercises e where e.name = v.name
);
