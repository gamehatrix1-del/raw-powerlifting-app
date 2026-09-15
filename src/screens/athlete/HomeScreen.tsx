import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { computeStreak, dateKey, thisMonday } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";
import { Program, ProgramDay } from "../../types/program";

export default function HomeScreen({ navigation }: any) {
  const { profile, session } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [todayDay, setTodayDay] = useState<ProgramDay | null>(null);
  const [plannedThisWeek, setPlannedThisWeek] = useState(0);
  const [doneThisWeek, setDoneThisWeek] = useState(0);
  const [streak, setStreak] = useState(0);
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

    setProgram((latestProgram as Program) ?? null);

    if (latestProgram && latestProgram.week_start_date === thisMonday()) {
      const { data: days } = await supabase
        .from("program_days")
        .select("*")
        .eq("program_id", latestProgram.id)
        .order("day_number", { ascending: true });

      const allDays = (days as ProgramDay[]) ?? [];
      setPlannedThisWeek(allDays.filter((d) => !d.is_rest_day).length);

      const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
      setTodayDay(allDays[todayIndex] ?? null);
    } else {
      setPlannedThisWeek(0);
      setTodayDay(null);
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("logged_at")
      .eq("athlete_id", session.user.id)
      .gte("logged_at", since.toISOString());

    const dateKeys = new Set((logs ?? []).map((l) => dateKey(l.logged_at)));
    setStreak(computeStreak(dateKeys));

    const monday = thisMonday();
    const doneThisWeekCount = [...dateKeys].filter((k) => k >= monday).length;
    setDoneThisWeek(doneThisWeekCount);

    setLoading(false);
  }, [session]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

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
        <ErrorState message="Couldn't load your dashboard." onRetry={load} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hey {profile?.full_name?.split(" ")[0]}</Text>

      {todayDay ? (
        <Pressable
          style={styles.todayCard}
          onPress={() => navigation.navigate("Program")}
        >
          <Text style={styles.todayLabel}>
            Day {todayDay.day_number} — {todayDay.day_label}
          </Text>
          <Text style={styles.todaySub}>
            {todayDay.is_rest_day ? "Rest day" : "Tap to view & log today's session"}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>No session scheduled</Text>
          <Text style={styles.todaySub}>
            {program ? "Check your weekly program" : "Waiting on your coach"}
          </Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {doneThisWeek}/{plannedThisWeek || "—"}
          </Text>
          <Text style={styles.statLabel}>This week</Text>
        </View>
      </View>
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
  },
  greeting: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  todayCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },
  todayLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  todaySub: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
});
