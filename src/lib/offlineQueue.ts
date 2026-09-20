import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const QUEUE_KEY = "rpa_pending_workout_logs";

export interface PendingSetLog {
  localId: string;
  athlete_id: string;
  program_exercise_id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number;
  queued_at: string;
}

export async function getQueue(): Promise<PendingSetLog[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveQueue(queue: PendingSetLog[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueSetLog(
  entry: Omit<PendingSetLog, "localId" | "queued_at">
): Promise<PendingSetLog> {
  const queue = await getQueue();
  const pending: PendingSetLog = {
    ...entry,
    localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queued_at: new Date().toISOString(),
  };
  queue.push(pending);
  await saveQueue(queue);
  return pending;
}

export async function removeFromQueue(localId: string) {
  const queue = await getQueue();
  await saveQueue(queue.filter((q) => q.localId !== localId));
}

// Retries every queued set-log against Supabase. Entries that still fail
// (still offline) are left in the queue for the next flush attempt.
// Returns the ones that made it through, so the caller can reconcile its
// own UI state (swap a "pending" row for a real server id).
export async function flushQueue(): Promise<
  { localId: string; serverId: string; programExerciseId: string; setNumber: number }[]
> {
  const queue = await getQueue();
  if (queue.length === 0) return [];

  const synced: { localId: string; serverId: string; programExerciseId: string; setNumber: number }[] = [];
  for (const entry of queue) {
    const { localId, queued_at, ...payload } = entry;
    const { data, error } = await supabase
      .from("workout_logs")
      .insert(payload)
      .select("id")
      .single();
    if (!error && data) {
      synced.push({
        localId,
        serverId: data.id,
        programExerciseId: entry.program_exercise_id,
        setNumber: entry.set_number,
      });
      await removeFromQueue(localId);
    }
  }
  return synced;
}
