import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { thisMonday } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";
import { Program, ProgramDay } from "../../types/program";

interface DayExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  target_load: string | null;
  target_rpe: number | null;
  tempo_note: string | null;
  cue_text: string | null;
}

export default function ProgramScreen({ navigation }: any) {
  const { session } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [exercisesByDay, setExercisesByDay] = useState<
    Record<string, DayExercise[]>
  >({});
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    const { data: latestProgram, error: programError } = await supabase
      .from("programs")
      .select("*")
      .eq("athlete_id", session.user.id)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (programError) {
      console.error("Failed to load program", programError);
      setLoading(false);
      return;
    }

    if (!latestProgram) {
      setProgram(null);
      setDays([]);
      setLoading(false);
      return;
    }

    setProgram(latestProgram as Program);

    const { data: programDays, error: daysError } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_id", latestProgram.id)
      .order("day_number", { ascending: true });

    if (daysError) {
      console.error("Failed to load program days", daysError);
      setLoading(false);
      return;
    }

    setDays((programDays as ProgramDay[]) ?? []);

    const dayIds = (programDays ?? []).map((d) => d.id);
    if (dayIds.length > 0) {
      const { data: programExercises, error: exercisesError } = await supabase
        .from("program_exercises")
        .select("*, exercises(name, cue_text)")
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
            cue_text: row.exercises?.cue_text ?? null,
          });
          grouped[row.program_day_id] = list;
        }
        setExercisesByDay(grouped);
      }
    }

    if ((latestProgram as Program).week_start_date === thisMonday()) {
      const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
      setActiveDay(Math.min(todayIndex, (programDays?.length ?? 1) - 1));
    } else {
      setActiveDay(0);
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!program || days.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No program yet</Text>
        <Text style={styles.emptyBody}>
          Your coach hasn't assigned a week. Check back soon.
        </Text>
      </View>
    );
  }

  const activeProgramDay = days[activeDay];
  const activeExercises = exercisesByDay[activeProgramDay.id] ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{program.name}</Text>

      <View style={styles.dayTabs}>
        {days.map((d, i) => (
          <Text
            key={d.id}
            onPress={() => setActiveDay(i)}
            style={[styles.dayTab, activeDay === i && styles.dayTabActive]}
          >
            {d.day_number}
          </Text>
        ))}
      </View>

      <Text style={styles.dayLabel}>{activeProgramDay.day_label}</Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeProgramDay.is_rest_day ? (
          <View style={styles.restCard}>
            <Text style={styles.restText}>Rest day. Recover up.</Text>
          </View>
        ) : activeExercises.length === 0 ? (
          <Text style={styles.emptyBody}>Nothing programmed for this day.</Text>
        ) : (
          <>
            {activeExercises.map((e) => (
              <View key={e.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{e.name}</Text>
                <Text style={styles.exerciseMeta}>
                  {e.sets} sets x {e.reps}
                  {e.target_load ? ` @ ${e.target_load}` : ""}
                  {e.target_rpe ? ` · RPE ${e.target_rpe}` : ""}
                </Text>
                {e.tempo_note ? (
                  <Text style={styles.exerciseNote}>{e.tempo_note}</Text>
                ) : null}
                {e.cue_text ? (
                  <Text style={styles.exerciseCue}>{e.cue_text}</Text>
                ) : null}
              </View>
            ))}
            <Pressable
              style={styles.logWorkoutButton}
              onPress={() =>
                navigation.navigate("WorkoutLog", {
                  programDayId: activeProgramDay.id,
                  dayLabel: activeProgramDay.day_label,
                })
              }
            >
              <Text style={styles.logWorkoutButtonText}>Log this workout</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  dayTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    textAlign: "center",
    backgroundColor: colors.card,
    color: colors.muted,
    fontWeight: "600",
    overflow: "hidden",
  },
  dayTabActive: {
    backgroundColor: colors.accent,
    color: "#fff",
  },
  dayLabel: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  restCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  restText: {
    color: colors.muted,
    fontSize: 15,
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  exerciseMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  exerciseNote: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 4,
  },
  exerciseCue: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  logWorkoutButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  logWorkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
