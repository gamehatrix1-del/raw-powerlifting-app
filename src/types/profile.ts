export type UserRole = "athlete" | "coach";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AthleteProfile {
  id: string;
  user_id: string;
  squat_1rm: number | null;
  bench_1rm: number | null;
  deadlift_1rm: number | null;
  squat_style: string | null;
  equipment_access: string | null;
  injuries_notes: string | null;
  recovery_notes: string | null;
  onboarded_at: string | null;
  created_at: string;
}
