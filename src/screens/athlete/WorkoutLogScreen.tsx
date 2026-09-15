import Slider from "@react-native-community/slider";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";

const REST_SECONDS = 90;

interface ExerciseWithTarget {
  programExerciseId: string;
  exerciseId: string;
  name: string;
  cueText: string | null;
  sets: number;
  reps: string;
  targetLoad: string | null;
  targetRpe: number | null;
  lastTime: string | null;
}

interface SetInput {
  weight: string;
  reps: string;
  rpe: number;
  logged: boolean;
}

export default function WorkoutLogScreen({ route }: any) {
  const { programDayId, dayLabel } = route.params as {
    programDayId: string;
    dayLabel: string;
  };
  const { session } = useAuth();

  const [exercises, setExercises] = useState<ExerciseWithTarget[]>([]);
  const [setInputs, setSetInputs] = useState<Record<string, SetInput[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(false);

    const { data: programExercises, error: exercisesError } = await supabase
      .from("program_exercises")
      .select("*, exercises(id, name, cue_text)")
      .eq("program_day_id", programDayId)
      .order("order_index", { ascending: true });

    if (exercisesError) {
      console.error("Failed to load exercises", exercisesError);
      setError(true);
      setLoading(false);
      return;
    }

    const results: ExerciseWithTarget[] = [];
    const inputs: Record<string, SetInput[]> = {};

    for (const row of programExercises ?? []) {
      const { data: lastLog } = await supabase
        .from("workout_logs")
        .select("weight, reps, rpe")
        .eq("athlete_id", session.user.id)
        .eq("exercise_id", row.exercise_id)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastTime = lastLog
        ? `${lastLog.weight ?? "—"}kg x ${lastLog.reps ?? "—"}${
            lastLog.rpe ? ` @ RPE ${lastLog.rpe}` : ""
          }`
        : null;

      results.push({
        programExerciseId: row.id,
        exerciseId: row.exercise_id,
        name: row.exercises?.name ?? "Exercise",
        cueText: row.exercises?.cue_text ?? null,
        sets: row.sets,
        reps: row.reps,
        targetLoad: row.target_load,
        targetRpe: row.target_rpe,
        lastTime,
      });

      inputs[row.id] = Array.from({ length: row.sets }, () => ({
        weight: "",
        reps: "",
        rpe: row.target_rpe ?? 8,
        logged: false,
      }));
    }

    setExercises(results);
    setSetInputs(inputs);
    setLoading(false);
  }, [session, programDayId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (restRemaining <= 0) return;
    const id = setInterval(() => {
      setRestRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [restRemaining]);

  function updateSet(
    programExerciseId: string,
    setIndex: number,
    patch: Partial<SetInput>
  ) {
    setSetInputs((prev) => ({
      ...prev,
      [programExerciseId]: prev[programExerciseId].map((s, i) =>
        i === setIndex ? { ...s, ...patch } : s
      ),
    }));
  }

  async function handleLogSet(
    exercise: ExerciseWithTarget,
    setIndex: number
  ) {
    if (!session) return;
    const input = setInputs[exercise.programExerciseId][setIndex];
    const { error } = await supabase.from("workout_logs").insert({
      athlete_id: session.user.id,
      program_exercise_id: exercise.programExerciseId,
      exercise_id: exercise.exerciseId,
      set_number: setIndex + 1,
      weight: input.weight ? Number(input.weight) : null,
      reps: input.reps ? Number(input.reps) : null,
      rpe: input.rpe,
    });
    if (error) {
      Alert.alert("Couldn't log set", error.message);
      return;
    }
    updateSet(exercise.programExerciseId, setIndex, { logged: true });
    setRestRemaining(REST_SECONDS);
  }

  const restLabel = useMemo(() => {
    const m = Math.floor(restRemaining / 60);
    const s = restRemaining % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [restRemaining]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <ErrorState message="Couldn't load this workout." onRetry={load} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{dayLabel}</Text>

        {exercises.map((exercise) => (
          <View key={exercise.programExerciseId} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseTarget}>
              Target: {exercise.sets} x {exercise.reps}
              {exercise.targetLoad ? ` @ ${exercise.targetLoad}` : ""}
              {exercise.targetRpe ? ` · RPE ${exercise.targetRpe}` : ""}
            </Text>
            {exercise.lastTime ? (
              <Text style={styles.lastTime}>Last time: {exercise.lastTime}</Text>
            ) : null}
            {exercise.cueText ? (
              <Text style={styles.cueText}>{exercise.cueText}</Text>
            ) : null}

            {setInputs[exercise.programExerciseId]?.map((set, index) => (
              <View key={index} style={styles.setRow}>
                <Text style={styles.setNumber}>{index + 1}</Text>
                <TextInput
                  style={[styles.setInput, set.logged && styles.setInputDone]}
                  placeholder="kg"
                  placeholderTextColor={colors.faint}
                  keyboardType="numeric"
                  editable={!set.logged}
                  value={set.weight}
                  onChangeText={(text) =>
                    updateSet(exercise.programExerciseId, index, {
                      weight: text,
                    })
                  }
                />
                <TextInput
                  style={[styles.setInput, set.logged && styles.setInputDone]}
                  placeholder="reps"
                  placeholderTextColor={colors.faint}
                  keyboardType="numeric"
                  editable={!set.logged}
                  value={set.reps}
                  onChangeText={(text) =>
                    updateSet(exercise.programExerciseId, index, {
                      reps: text,
                    })
                  }
                />
                <View style={styles.rpeBlock}>
                  <Text style={styles.rpeValue}>RPE {set.rpe.toFixed(1)}</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={5}
                    maximumValue={10}
                    step={0.5}
                    value={set.rpe}
                    disabled={set.logged}
                    minimumTrackTintColor={colors.accent}
                    maximumTrackTintColor={colors.card}
                    thumbTintColor={colors.accent}
                    onValueChange={(value: number) =>
                      updateSet(exercise.programExerciseId, index, {
                        rpe: value,
                      })
                    }
                  />
                </View>
                <Pressable
                  style={[
                    styles.logButton,
                    set.logged && styles.logButtonDone,
                  ]}
                  onPress={() => handleLogSet(exercise, index)}
                  disabled={set.logged}
                >
                  <Text style={styles.logButtonText}>
                    {set.logged ? "✓" : "Log"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {restRemaining > 0 && (
        <View style={styles.restBanner}>
          <Text style={styles.restText}>Rest — {restLabel}</Text>
          <Pressable onPress={() => setRestRemaining(0)}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 24,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  exerciseTarget: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  lastTime: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 4,
  },
  cueText: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  setNumber: {
    color: colors.muted,
    width: 16,
    fontWeight: "600",
  },
  setInput: {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: 56,
    textAlign: "center",
    fontSize: 15,
  },
  setInputDone: {
    opacity: 0.5,
  },
  rpeBlock: {
    flex: 1,
  },
  rpeValue: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: -4,
  },
  slider: {
    width: "100%",
    height: 32,
  },
  logButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logButtonDone: {
    backgroundColor: colors.background,
  },
  logButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  restBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  skipText: {
    color: "#fff",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
