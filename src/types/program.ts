export type ProgramStatus = "draft" | "active" | "completed";

export interface Program {
  id: string;
  athlete_id: string;
  coach_id: string;
  name: string;
  week_start_date: string;
  status: ProgramStatus;
  created_at: string;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  day_number: number;
  day_label: string;
  is_rest_day: boolean;
}

export interface ProgramExercise {
  id: string;
  program_day_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: string;
  target_load: string | null;
  target_rpe: number | null;
  tempo_note: string | null;
}
