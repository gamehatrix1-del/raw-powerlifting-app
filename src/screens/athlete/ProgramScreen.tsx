import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { thisMonday } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { Program, ProgramDay } from "../../types/program";

function weekdayAbbrev(mondayIso: string, dayNumber: number): string {
  const d = new Date(mondayIso + "T00:00:00");
  d.setDate(d.getDate() + (dayNumber - 1));
  return d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
}

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
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [exercisesByDay, setExercisesByDay] = useState<
    Record<string, DayExercise[]>
  >({});
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(false);

    const { data: latestProgram, error: programError } = await supabase
      .from("programs")
      .select("*")
      .eq("athlete_id", session.user.id)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (programError) {
      console.error("Failed to load program", programError);
      setError(true);
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
      setError(true);
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
        <ErrorState message="Couldn't load your program." onRetry={load} />
      </View>
    );
  }

  if (!program || days.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.xxl,
        }}
      >
        <View
          style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: colors.accentMuted,
            alignItems: "center", justifyContent: "center",
            marginBottom: spacing.lg,
          }}
        >
          <Ionicons name="calendar-outline" size={30} color={colors.accent} />
        </View>
        <Text style={[typography.heading, { color: colors.text, marginBottom: 6 }]}>
          No program yet
        </Text>
        <Text style={[typography.body, { color: colors.muted, textAlign: "center" }]}>
          Your coach hasn't assigned a week. Check back soon.
        </Text>
      </View>
    );
  }

  const activeProgramDay = days[activeDay];
  const activeExercises = exercisesByDay[activeProgramDay.id] ?? [];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 16,
        paddingHorizontal: spacing.xl,
      }}
    >
      <Text style={[typography.display, { color: colors.text, fontSize: 26, marginBottom: 2 }]}>
        {program.name}
      </Text>
      <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.lg }]}>
        Tap a day below to see what's on it
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm + 2, paddingBottom: spacing.lg }}
      >
        {days.map((d, i) => {
          const active = i === activeDay;
          const dayExerciseCount = (exercisesByDay[d.id] ?? []).length;
          return (
            <AnimatedPressable
              key={d.id}
              onPress={() => setActiveDay(i)}
              style={{
                width: 92,
                backgroundColor: active ? colors.accent : colors.card,
                borderRadius: radius.lg,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.sm,
                alignItems: "center",
              }}
            >
              <Text
                style={[
                  typography.micro,
                  { color: active ? colors.accentText : colors.faint, letterSpacing: 0.5 },
                ]}
              >
                {weekdayAbbrev(program.week_start_date, d.day_number)}
              </Text>
              <View
                style={{
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: active ? "rgba(255,255,255,0.22)" : colors.accentMuted,
                  alignItems: "center", justifyContent: "center",
                  marginVertical: 6,
                }}
              >
                <Ionicons
                  name={d.is_rest_day ? "bed" : "barbell"}
                  size={14}
                  color={active ? colors.accentText : colors.accent}
                />
              </View>
              <Text
                style={[
                  typography.caption,
                  { color: active ? colors.accentText : colors.text, fontWeight: "700", textAlign: "center" },
                ]}
                numberOfLines={1}
              >
                {d.is_rest_day ? "Rest" : d.day_label}
              </Text>
              {!d.is_rest_day && (
                <Text
                  style={[
                    typography.micro,
                    { color: active ? colors.accentText : colors.muted, letterSpacing: 0, marginTop: 2, opacity: 0.85 },
                  ]}
                >
                  {dayExerciseCount} {dayExerciseCount === 1 ? "exercise" : "exercises"}
                </Text>
              )}
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.md }]}>
        {activeProgramDay.day_label}
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {activeProgramDay.is_rest_day ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              padding: spacing.xxl,
              alignItems: "center",
            }}
          >
            <Ionicons name="bed-outline" size={30} color={colors.faint} style={{ marginBottom: spacing.sm }} />
            <Text style={[typography.body, { color: colors.muted }]}>
              Rest day. Recover up.
            </Text>
          </View>
        ) : activeExercises.length === 0 ? (
          <Text style={[typography.body, { color: colors.muted, textAlign: "center" }]}>
            Nothing programmed for this day.
          </Text>
        ) : (
          <>
            {activeExercises.map((e, index) => (
              <View
                key={e.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  marginBottom: spacing.sm + 2,
                  flexDirection: "row",
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: colors.accentMuted,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: spacing.md,
                  }}
                >
                  <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.subheading, { color: colors.text, fontSize: 16 }]}>{e.name}</Text>
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
                    <Text style={[typography.caption, { color: colors.faint, marginTop: spacing.sm }]}>
                      {e.tempo_note}
                    </Text>
                  ) : null}
                  {e.cue_text ? (
                    <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: spacing.sm, gap: 4 }}>
                      <Ionicons name="bulb-outline" size={13} color={colors.accent} style={{ marginTop: 2 }} />
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.accent, fontStyle: "italic", flex: 1 },
                        ]}
                      >
                        {e.cue_text}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
            <AnimatedPressable
              style={{
                backgroundColor: colors.accent,
                borderRadius: radius.lg,
                paddingVertical: spacing.lg,
                alignItems: "center",
                marginTop: spacing.xs,
                flexDirection: "row",
                justifyContent: "center",
                gap: spacing.sm,
              }}
              onPress={() =>
                navigation.navigate("WorkoutLog", {
                  programDayId: activeProgramDay.id,
                  dayLabel: activeProgramDay.day_label,
                })
              }
            >
              <Ionicons name="play" size={16} color={colors.accentText} />
              <Text style={[typography.bodyStrong, { color: colors.accentText, fontSize: 16 }]}>
                Log this workout
              </Text>
            </AnimatedPressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}
