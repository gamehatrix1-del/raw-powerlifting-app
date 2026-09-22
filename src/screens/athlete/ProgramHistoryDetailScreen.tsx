import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import ErrorState from "../../components/ErrorState";
import SegmentedControl from "../../components/SegmentedControl";
import { useAuth } from "../../context/AuthContext";
import { formatDisplayDate } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { ProgramDay } from "../../types/program";

interface DayExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  target_load: string | null;
  target_rpe: number | null;
  tempo_note: string | null;
}

interface LoggedSet {
  id: string;
  program_exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  coach_note: string | null;
}

export default function ProgramHistoryDetailScreen({ route, navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const { session } = useAuth();
  const { programId, programName, weekStartDate, status } = route.params as {
    programId: string;
    programName: string;
    weekStartDate: string;
    status: string;
  };

  const [days, setDays] = useState<ProgramDay[]>([]);
  const [exercisesByDay, setExercisesByDay] = useState<Record<string, DayExercise[]>>({});
  const [logsByExercise, setLogsByExercise] = useState<Record<string, LoggedSet[]>>({});
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(false);

    const { data: programDays, error: daysError } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_id", programId)
      .order("day_number", { ascending: true });

    if (daysError) {
      console.error("Failed to load program days", daysError);
      setError(true);
      setLoading(false);
      return;
    }

    setDays((programDays as ProgramDay[]) ?? []);

    const dayIds = (programDays ?? []).map((d) => d.id);
    if (dayIds.length > 0) {
      const { data: programExercises, error: exercisesError } = await supabase
        .from("program_exercises")
        .select("*, exercises(name)")
        .in("program_day_id", dayIds)
        .order("order_index", { ascending: true });

      if (exercisesError) {
        console.error("Failed to load program exercises", exercisesError);
      } else {
        const grouped: Record<string, DayExercise[]> = {};
        for (const row of programExercises ?? []) {
          const list = grouped[row.program_day_id] ?? [];
          list.push({
            id: row.id,
            name: row.exercises?.name ?? "Exercise",
            sets: row.sets,
            reps: row.reps,
            target_load: row.target_load,
            target_rpe: row.target_rpe,
            tempo_note: row.tempo_note,
          });
          grouped[row.program_day_id] = list;
        }
        setExercisesByDay(grouped);

        const programExerciseIds = (programExercises ?? []).map((row) => row.id);
        if (programExerciseIds.length > 0) {
          const { data: logs, error: logsError } = await supabase
            .from("workout_logs")
            .select("id, program_exercise_id, set_number, weight, reps, rpe, coach_note")
            .eq("athlete_id", session.user.id)
            .in("program_exercise_id", programExerciseIds)
            .order("set_number", { ascending: true });

          if (logsError) {
            console.error("Failed to load logged sets", logsError);
          } else {
            const byExercise: Record<string, LoggedSet[]> = {};
            for (const log of (logs as LoggedSet[]) ?? []) {
              const list = byExercise[log.program_exercise_id] ?? [];
              list.push(log);
              byExercise[log.program_exercise_id] = list;
            }
            setLogsByExercise(byExercise);
          }
        }
      }
    }

    setLoading(false);
  }, [programId, session]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || days.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ErrorState message="Couldn't load this program." onRetry={load} />
      </View>
    );
  }

  const activeProgramDay = days[activeDay];
  const activeExercises = exercisesByDay[activeProgramDay.id] ?? [];
  const isActive = status === "active";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 20, paddingHorizontal: spacing.xl }}>
      <Text style={[typography.title, { color: colors.text }]}>{programName}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4, marginBottom: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.muted }]}>Week of {formatDisplayDate(weekStartDate)}</Text>
        <View
          style={{
            backgroundColor: isActive ? colors.successMuted : colors.cardAlt,
            borderRadius: radius.tag,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={[typography.micro, { color: isActive ? colors.success : colors.faint, letterSpacing: 0 }]}>
            {status.toUpperCase()}
          </Text>
        </View>
      </View>

      <SegmentedControl
        options={days.map((d) => ({ label: String(d.day_number), value: d.id }))}
        value={activeProgramDay.id}
        onChange={(id) => setActiveDay(days.findIndex((d) => d.id === id))}
      />

      <Text style={[typography.subheading, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md }]}>
        {activeProgramDay.day_label}
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {activeProgramDay.is_rest_day ? (
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xxl, alignItems: "center" }}>
            <Ionicons name="bed-outline" size={28} color={colors.faint} style={{ marginBottom: spacing.sm }} />
            <Text style={[typography.body, { color: colors.muted }]}>Rest day</Text>
          </View>
        ) : activeExercises.length === 0 ? (
          <Text style={[typography.body, { color: colors.muted, textAlign: "center" }]}>
            Nothing programmed for this day.
          </Text>
        ) : (
          activeExercises.map((e, index) => {
            const loggedSets = logsByExercise[e.id] ?? [];
            return (
              <View
                key={e.id}
                style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm + 2 }}
              >
                <View style={{ flexDirection: "row" }}>
                  <View
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: colors.accentMuted,
                      alignItems: "center", justifyContent: "center",
                      marginRight: spacing.md,
                    }}
                  >
                    <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.subheading, { color: colors.text }]}>{e.name}</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm }}>
                      <View style={{ backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={[typography.micro, { color: colors.text, letterSpacing: 0 }]}>
                          {e.sets} × {e.reps}
                        </Text>
                      </View>
                      {e.target_load && (
                        <View style={{ backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={[typography.micro, { color: colors.text, letterSpacing: 0 }]}>{e.target_load}</Text>
                        </View>
                      )}
                      {e.target_rpe && (
                        <View style={{ backgroundColor: colors.accentMuted, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={[typography.micro, { color: colors.accent, letterSpacing: 0 }]}>RPE {e.target_rpe}</Text>
                        </View>
                      )}
                    </View>
                    {e.tempo_note ? (
                      <Text style={[typography.caption, { color: colors.faint, marginTop: spacing.sm }]}>{e.tempo_note}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.background }}>
                  {loggedSets.length === 0 ? (
                    <Text style={[typography.caption, { color: colors.faint }]}>Not logged.</Text>
                  ) : (
                    loggedSets.map((s) => (
                      <View key={s.id} style={{ marginBottom: spacing.sm }}>
                        <Text style={[typography.caption, { color: colors.text }]}>
                          Set {s.set_number}: {s.weight ?? "—"}kg × {s.reps ?? "—"}
                          {s.rpe ? ` @ RPE ${s.rpe}` : ""}
                        </Text>
                        {s.coach_note ? (
                          <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 4, gap: 4 }}>
                            <Ionicons name="chatbubble" size={11} color={colors.accent} style={{ marginTop: 2 }} />
                            <Text style={[typography.micro, { color: colors.accent, letterSpacing: 0, flex: 1 }]}>
                              {s.coach_note}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ))
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
