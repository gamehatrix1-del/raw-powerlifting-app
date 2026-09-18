-- Expands athlete_profiles to match the real RAW@ Powerlifting Coaching
-- Services athlete intake form (10 sections), which is far more detailed
-- than the original guess: full athlete profile, best lift numbers
-- (1RM/3RM/competition PR per lift), training schedule, recovery,
-- detailed technique, medical/injury history, nutrition, and a real
-- equipment checklist.

alter table athlete_profiles
  -- Section 1: Athlete Profile
  add column age smallint,
  add column gender text,
  add column city text,
  add column height_cm numeric,
  add column bodyweight_kg numeric,
  add column body_fat_pct numeric,
  add column weight_class text,
  add column occupation text,
  add column training_experience text,
  add column powerlifting_experience text,
  add column federation text,
  add column meet_date date,
  add column meets_done smallint,
  add column current_goal text,
  add column training_days_per_week smallint,
  -- Section 2: Best Lift Numbers (squat_1rm/bench_1rm/deadlift_1rm already
  -- exist from 0001 and now mean "Best 1RM")
  add column squat_best_3rm numeric,
  add column squat_competition_pr numeric,
  add column bench_best_3rm numeric,
  add column bench_competition_pr numeric,
  add column deadlift_best_3rm numeric,
  add column deadlift_competition_pr numeric,
  -- Section 3: Training Information
  add column training_time text,
  add column session_duration text,
  add column wake_time text,
  add column sleep_time text,
  add column sleep_hours numeric,
  -- Section 4: Daily Routine & Recovery
  add column recovery_tools text[],
  add column stress_level smallint,
  add column sleep_quality smallint,
  add column recovery_level smallint,
  -- Section 5: Technique Profile (squat_style already exists, now holds
  -- High Bar / Low Bar / SSB)
  add column squat_stance text,
  add column bench_grip text,
  add column bench_arch text,
  add column deadlift_style text,
  add column deadlift_grip text,
  -- Section 6: Medical History (distinct from injuries_notes, which is
  -- Section 7's injury history)
  add column medical_conditions text,
  add column past_surgeries text,
  -- Section 8: Nutrition & Supplementation
  add column diet_type text,
  add column protein_intake_g numeric,
  add column water_intake_l numeric,
  add column food_allergies text,
  add column current_supplements text,
  -- Section 10: Additional Notes / Coaching Information
  add column coaching_notes text;

-- Section 9: Equipment & Gym Access is a real checklist (comp rack, power
-- rack, squat bar, deadlift bar, SSB bar, belt squat, reverse hyper, GHD,
-- cable machine), not free text — replace the column entirely.
alter table athlete_profiles drop column if exists equipment_access;
alter table athlete_profiles add column equipment_access text[];
