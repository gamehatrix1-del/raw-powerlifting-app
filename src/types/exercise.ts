export type ExerciseCategory = "strength" | "cardio" | "mobility";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  demo_video_url: string | null;
  cue_text: string | null;
  created_by: string | null;
  created_at: string;
}
