export type UserRole = "athlete" | "coach";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  consent_accepted_at: string | null;
  created_at: string;
}

export interface AthleteProfile {
  id: string;
  user_id: string;

  // Section 1: Athlete Profile
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  height_cm: number | null;
  bodyweight_kg: number | null;
  body_fat_pct: number | null;
  weight_class: string | null;
  occupation: string | null;
  training_experience: string | null;
  powerlifting_experience: string | null;
  federation: string | null;
  meet_date: string | null;
  meets_done: number | null;
  current_goal: string | null;
  training_days_per_week: number | null;

  // Section 2: Best Lift Numbers
  squat_1rm: number | null;
  squat_best_3rm: number | null;
  squat_competition_pr: number | null;
  bench_1rm: number | null;
  bench_best_3rm: number | null;
  bench_competition_pr: number | null;
  deadlift_1rm: number | null;
  deadlift_best_3rm: number | null;
  deadlift_competition_pr: number | null;

  // Section 3: Training Information
  training_time: string | null;
  session_duration: string | null;
  wake_time: string | null;
  sleep_time: string | null;
  sleep_hours: number | null;

  // Section 4: Daily Routine & Recovery
  recovery_tools: string[] | null;
  stress_level: number | null;
  sleep_quality: number | null;
  recovery_level: number | null;

  // Section 5: Technique Profile
  squat_style: string | null;
  squat_stance: string | null;
  bench_grip: string | null;
  bench_arch: string | null;
  deadlift_style: string | null;
  deadlift_grip: string | null;

  // Section 6: Medical History
  medical_conditions: string | null;
  past_surgeries: string | null;

  // Section 7: Injury History
  injuries_notes: string | null;

  // Section 8: Nutrition & Supplementation
  diet_type: string | null;
  protein_intake_g: number | null;
  water_intake_l: number | null;
  food_allergies: string | null;
  current_supplements: string | null;

  // Section 9: Equipment & Gym Access
  equipment_access: string[] | null;

  // Section 10: Additional Notes / Coaching Information
  coaching_notes: string | null;

  recovery_notes: string | null;
  onboarded_at: string | null;
  created_at: string;
}
