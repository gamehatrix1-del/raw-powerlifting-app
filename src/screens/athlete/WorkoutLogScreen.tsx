import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { enqueueSetLog, flushQueue } from "../../lib/offlineQueue";
import { cancelScheduledNotification, scheduleRestTimerNotification } from "../../lib/notifications";
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

type SyncState = "unsaved" | "saving" | "synced" | "pending";

interface SetInput {
  weight: string;
  reps: string;
  rpe: number;
  logId: string | null;
  sync: SyncState;
  coachNote: string | null;
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function WorkoutLogScreen({ route }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
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
  const restNotificationId = useRef<string | null>(null);

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

      // Already-logged sets for THIS exercise today, so reopening the
      // screen mid-session shows what's really saved instead of a blank
      // slate that would re-insert duplicates on the next tap.
      const { data: todaysLogs } = await supabase
        .from("workout_logs")
        .select("id, set_number, weight, reps, rpe, coach_note")
        .eq("athlete_id", session.user.id)
        .eq("program_exercise_id", row.id)
        .gte("logged_at", startOfToday())
        .order("set_number", { ascending: true });

      const bySetNumber = new Map((todaysLogs ?? []).map((l) => [l.set_number, l]));

      inputs[row.id] = Array.from({ length: row.sets }, (_, i) => {
        const existing = bySetNumber.get(i + 1);
        return existing
          ? {
              weight: existing.weight != null ? String(existing.weight) : "",
              reps: existing.reps != null ? String(existing.reps) : "",
              rpe: existing.rpe ?? row.target_rpe ?? 8,
              logId: existing.id,
              sync: "synced" as SyncState,
              coachNote: existing.coach_note ?? null,
            }
          : {
              weight: "",
              reps: "",
              rpe: row.target_rpe ?? 8,
              logId: null,
              sync: "unsaved" as SyncState,
              coachNote: null,
            };
      });
    }

    setExercises(results);
    setSetInputs(inputs);
    setLoading(false);
  }, [session, programDayId]);

  useEffect(() => {
    load();
  }, [load]);

  // Offline resilience: retry queued sets on mount, whenever the app comes
  // back to the foreground, and on a slow periodic timer while this screen
  // is open — covers "signal came back mid-workout" without needing a
  // dedicated connectivity-detection native module.
  const syncPending = useCallback(async () => {
    const synced = await flushQueue();
    if (synced.length === 0) return;
    setSetInputs((prev) => {
      const next = { ...prev };
      for (const s of synced) {
        const list = next[s.programExerciseId];
        if (!list) continue;
        next[s.programExerciseId] = list.map((set, i) =>
          i === s.setNumber - 1 ? { ...set, sync: "synced" as SyncState, logId: s.serverId } : set
        );
      }
      return next;
    });
  }, []);

  useEffect(() => {
    syncPending();
    const interval = setInterval(syncPending, 20000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncPending();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [syncPending]);

  useEffect(() => {
    if (restRemaining <= 0) return;
    const id = setInterval(() => {
      setRestRemaining((s) => {
        const next = Math.max(0, s - 1);
        if (next === 0) {
          // Counted down while still foregrounded — the local notification
          // would be redundant, so cancel it.
          cancelScheduledNotification(restNotificationId.current);
          restNotificationId.current = null;
        }
        return next;
      });
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

    // Schedules a local notification as a backstop in case the athlete
    // backgrounds the app mid-rest — cancelled below if they return before
    // it fires (stopRestTimer, or a fresh startRestTimer for the next set).
    cancelScheduledNotification(restNotificationId.current);
    restNotificationId.current = null;
    scheduleRestTimerNotification(REST_SECONDS).then((id) => {
      restNotificationId.current = id;
    });
  }

  function stopRestTimer() {
    setRestRemaining(0);
    restProgress.stopAnimation();
    cancelScheduledNotification(restNotificationId.current);
    restNotificationId.current = null;
  }

  useEffect(() => {
    return () => {
      cancelScheduledNotification(restNotificationId.current);
    };
  }, []);

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
    const payload = {
      athlete_id: session.user.id,
      program_exercise_id: exercise.programExerciseId,
      exercise_id: exercise.exerciseId,
      set_number: setIndex + 1,
      weight: input.weight ? Number(input.weight) : null,
      reps: input.reps ? Number(input.reps) : null,
      rpe: input.rpe,
    };

    updateSet(exercise.programExerciseId, setIndex, { sync: "saving" });

    if (input.logId) {
      // Editing an already-synced set.
      const { error } = await supabase
        .from("workout_logs")
        .update(payload)
        .eq("id", input.logId);
      if (error) {
        alert("Couldn't save changes", error.message);
        updateSet(exercise.programExerciseId, setIndex, { sync: "synced" });
        return;
      }
      updateSet(exercise.programExerciseId, setIndex, { sync: "synced" });
      startRestTimer();
      return;
    }

    const { data, error } = await supabase
      .from("workout_logs")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      // Likely offline — queue it locally and keep going. It'll sync
      // automatically once flushQueue() succeeds.
      await enqueueSetLog(payload);
      updateSet(exercise.programExerciseId, setIndex, { sync: "pending", logId: null });
      startRestTimer();
      return;
    }

    updateSet(exercise.programExerciseId, setIndex, { sync: "synced", logId: data.id });
    startRestTimer();
  }

  function handleSetTap(exercise: ExerciseWithTarget, setIndex: number) {
    const input = setInputs[exercise.programExerciseId][setIndex];

    if (input.sync === "unsaved" || input.sync === "saving") {
      handleLogSet(exercise, setIndex);
      return;
    }

    if (input.sync === "pending") {
      alert(
        "Saved offline",
        "This set is waiting for a connection to sync. It'll upload automatically — no need to log it again.",
        [{ text: "OK" }]
      );
      return;
    }

    // synced — offer to edit or delete
    alert(input.weight && input.reps ? `${input.weight}kg × ${input.reps}` : "This set", "What would you like to do?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Edit",
        onPress: () => updateSet(exercise.programExerciseId, setIndex, { sync: "unsaved" }),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDeleteSet(exercise, setIndex),
      },
    ]);
  }

  async function handleDeleteSet(exercise: ExerciseWithTarget, setIndex: number) {
    const input = setInputs[exercise.programExerciseId][setIndex];
    if (!input.logId) return;
    const { error } = await supabase.from("workout_logs").delete().eq("id", input.logId);
    if (error) {
      alert("Couldn't delete set", error.message);
      return;
    }
    updateSet(exercise.programExerciseId, setIndex, {
      weight: "",
      reps: "",
      logId: null,
      sync: "unsaved",
    });
  }

  const restLabel = useMemo(() => {
    const m = Math.floor(restRemaining / 60);
    const s = restRemaining % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [restRemaining]);

  const pendingCount = Object.values(setInputs)
    .flat()
    .filter((s) => s.sync === "pending").length;

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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.xs }]}>
          {dayLabel}
        </Text>
        {pendingCount > 0 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: colors.warningMuted,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.sm + 2,
              paddingVertical: 6,
              alignSelf: "flex-start",
              marginBottom: spacing.md,
            }}
          >
            <Ionicons name="cloud-offline-outline" size={13} color={colors.warning} />
            <Text style={[typography.micro, { color: colors.warning, letterSpacing: 0 }]}>
              {pendingCount} {pendingCount === 1 ? "set" : "sets"} waiting to sync
            </Text>
          </View>
        )}

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

            {setInputs[exercise.programExerciseId]?.map((set, index) => {
              const locked = set.sync === "synced" || set.sync === "pending" || set.sync === "saving";
              return (
                <View key={index}>
                <View
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
                      backgroundColor: set.sync === "synced" ? colors.successMuted : set.sync === "pending" ? colors.warningMuted : colors.background,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text
                      style={[
                        typography.micro,
                        {
                          color: set.sync === "synced" ? colors.success : set.sync === "pending" ? colors.warning : colors.muted,
                          letterSpacing: 0,
                        },
                      ]}
                    >
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
                      opacity: locked ? 0.5 : 1,
                    }}
                    placeholder="kg"
                    placeholderTextColor={colors.faint}
                    keyboardType="numeric"
                    editable={!locked}
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
                      opacity: locked ? 0.5 : 1,
                    }}
                    placeholder="reps"
                    placeholderTextColor={colors.faint}
                    keyboardType="numeric"
                    editable={!locked}
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
                      disabled={locked}
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
                      backgroundColor:
                        set.sync === "synced" ? colors.successMuted : set.sync === "pending" ? colors.warningMuted : colors.accent,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => handleSetTap(exercise, index)}
                    disabled={set.sync === "saving"}
                  >
                    {set.sync === "saving" ? (
                      <ActivityIndicator size="small" color={colors.accentText} />
                    ) : (
                      <Ionicons
                        name={set.sync === "pending" ? "cloud-offline-outline" : "checkmark"}
                        size={19}
                        color={set.sync === "synced" ? colors.success : set.sync === "pending" ? colors.warning : colors.accentText}
                      />
                    )}
                  </AnimatedPressable>
                </View>
                {set.coachNote ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 6,
                      marginTop: 6,
                      marginLeft: 30,
                    }}
                  >
                    <Ionicons name="chatbubble" size={12} color={colors.accent} style={{ marginTop: 2 }} />
                    <Text style={[typography.caption, { color: colors.accent, fontStyle: "italic", flex: 1 }]}>
                      Coach: {set.coachNote}
                    </Text>
                  </View>
                ) : null}
                </View>
              );
            })}
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
            paddingBottom: insets.bottom + spacing.lg,
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
