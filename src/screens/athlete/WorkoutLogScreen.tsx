import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";

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
  const { colors, typography, spacing, radius } = useTheme();
  const alert = useAppAlert();
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
  const restProgress = useRef(new Animated.Value(0)).current;

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

  function startRestTimer() {
    setRestRemaining(REST_SECONDS);
    restProgress.setValue(1);
    Animated.timing(restProgress, {
      toValue: 0,
      duration: REST_SECONDS * 1000,
      useNativeDriver: false,
    }).start();
  }

  function stopRestTimer() {
    setRestRemaining(0);
    restProgress.stopAnimation();
  }

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
      alert("Couldn't log set", error.message);
      return;
    }
    updateSet(exercise.programExerciseId, setIndex, { logged: true });
    startRestTimer();
  }

  const restLabel = useMemo(() => {
    const m = Math.floor(restRemaining / 60);
    const s = restRemaining % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [restRemaining]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ErrorState message="Couldn't load this workout." onRetry={load} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 24 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>
          {dayLabel}
        </Text>

        {exercises.map((exercise, exIndex) => (
          <View
            key={exercise.programExerciseId}
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.md + 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View
                style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: colors.accentMuted,
                  alignItems: "center", justifyContent: "center",
                  marginRight: spacing.sm + 2,
                  marginTop: 2,
                }}
              >
                <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>{exIndex + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.heading, { color: colors.text }]}>{exercise.name}</Text>
                <Text style={[typography.caption, { color: colors.muted, marginTop: 4 }]}>
                  Target: {exercise.sets} x {exercise.reps}
                  {exercise.targetLoad ? ` @ ${exercise.targetLoad}` : ""}
                  {exercise.targetRpe ? ` · RPE ${exercise.targetRpe}` : ""}
                </Text>
                {exercise.lastTime ? (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 }}>
                    <Ionicons name="time-outline" size={12} color={colors.faint} />
                    <Text style={[typography.caption, { color: colors.faint }]}>
                      Last time: {exercise.lastTime}
                    </Text>
                  </View>
                ) : null}
                {exercise.cueText ? (
                  <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 4, gap: 4 }}>
                    <Ionicons name="bulb-outline" size={12} color={colors.accent} style={{ marginTop: 2 }} />
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.accent, fontStyle: "italic", flex: 1 },
                      ]}
                    >
                      {exercise.cueText}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {setInputs[exercise.programExerciseId]?.map((set, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  marginTop: spacing.md + 2,
                }}
              >
                <View
                  style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: set.logged ? colors.successMuted : colors.background,
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={[typography.micro, { color: set.logged ? colors.success : colors.muted, letterSpacing: 0 }]}>
                    {index + 1}
                  </Text>
                </View>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: radius.sm,
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    width: 54,
                    textAlign: "center",
                    fontSize: 15,
                    opacity: set.logged ? 0.5 : 1,
                  }}
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
                  style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: radius.sm,
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    width: 54,
                    textAlign: "center",
                    fontSize: 15,
                    opacity: set.logged ? 0.5 : 1,
                  }}
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
                <View style={{ flex: 1 }}>
                  <Text style={[typography.caption, { color: colors.muted, fontSize: 11, marginBottom: -4 }]}>
                    RPE {set.rpe.toFixed(1)}
                  </Text>
                  <Slider
                    style={{ width: "100%", height: 32 }}
                    minimumValue={5}
                    maximumValue={10}
                    step={0.5}
                    value={set.rpe}
                    disabled={set.logged}
                    minimumTrackTintColor={colors.accent}
                    maximumTrackTintColor={colors.cardAlt}
                    thumbTintColor={colors.accent}
                    onValueChange={(value: number) =>
                      updateSet(exercise.programExerciseId, index, {
                        rpe: value,
                      })
                    }
                  />
                </View>
                <AnimatedPressable
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: set.logged ? colors.successMuted : colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => handleLogSet(exercise, index)}
                  disabled={set.logged}
                >
                  <Ionicons
                    name={set.logged ? "checkmark" : "checkmark"}
                    size={19}
                    color={set.logged ? colors.success : colors.accentText}
                  />
                </AnimatedPressable>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {restRemaining > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.card,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
            paddingHorizontal: spacing.xl,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            shadowColor: colors.shadow,
            shadowOpacity: 0.3,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -2 },
          }}
        >
          <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.cardAlt, overflow: "hidden", marginBottom: spacing.md }}>
            <Animated.View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.accent,
                width: restProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Ionicons name="hourglass-outline" size={18} color={colors.accent} />
              <Text style={[typography.bodyStrong, { color: colors.text, fontSize: 17, fontVariant: ["tabular-nums"] }]}>
                Resting — {restLabel}
              </Text>
            </View>
            <AnimatedPressable onPress={stopRestTimer} style={{ paddingHorizontal: spacing.md, paddingVertical: 6, backgroundColor: colors.cardAlt, borderRadius: radius.pill }}>
              <Text
                style={[
                  typography.caption,
                  { color: colors.text, fontWeight: "700" },
                ]}
              >
                Skip
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
