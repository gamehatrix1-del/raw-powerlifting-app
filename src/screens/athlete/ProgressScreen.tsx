import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import LineChart from "../../components/LineChart";
import { useAuth } from "../../context/AuthContext";
import { dateKey } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";

const LIFTS = [
  { key: "squat", label: "Squat", match: "squat" },
  { key: "bench", label: "Bench", match: "bench" },
  { key: "deadlift", label: "Deadlift", match: "deadlift" },
];

interface SeriesPoint {
  date: string;
  estOneRm: number;
}

function epleyOneRm(weight: number, reps: number) {
  return weight * (1 + reps / 30);
}

export default function ProgressScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [series, setSeries] = useState<Record<string, SeriesPoint[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    supabase
      .from("workout_logs")
      .select("weight, reps, logged_at, exercises(name)")
      .eq("athlete_id", session.user.id)
      .not("weight", "is", null)
      .not("reps", "is", null)
      .order("logged_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load workout logs", error);
          setLoading(false);
          return;
        }

        const byLift: Record<string, Map<string, number>> = {
          squat: new Map(),
          bench: new Map(),
          deadlift: new Map(),
        };

        for (const row of data ?? []) {
          const name = (row.exercises as any)?.name?.toLowerCase() ?? "";
          const lift = LIFTS.find((l) => name.includes(l.match));
          if (!lift || row.weight == null || row.reps == null) continue;

          const est = epleyOneRm(row.weight, row.reps);
          const day = dateKey(row.logged_at);
          const map = byLift[lift.key];
          map.set(day, Math.max(map.get(day) ?? 0, est));
        }

        const result: Record<string, SeriesPoint[]> = {};
        for (const lift of LIFTS) {
          result[lift.key] = [...byLift[lift.key].entries()]
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([date, estOneRm]) => ({ date, estOneRm }));
        }
        setSeries(result);
        setLoading(false);
      });
  }, [session]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const chartWidth = width - 24 * 2 - 32;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.title}>Progress</Text>

      {LIFTS.map((lift) => {
        const points = series[lift.key] ?? [];
        const latest = points[points.length - 1];
        const isPr =
          points.length > 0 &&
          latest.estOneRm === Math.max(...points.map((p) => p.estOneRm));

        return (
          <View key={lift.key} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.liftName}>{lift.label}</Text>
              {latest && (
                <View style={styles.valueRow}>
                  <Text style={styles.liftValue}>
                    {Math.round(latest.estOneRm)} kg est. 1RM
                  </Text>
                  {isPr && points.length > 1 && (
                    <View style={styles.prBadge}>
                      <Text style={styles.prBadgeText}>PR</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {points.length === 0 ? (
              <Text style={styles.emptyText}>No logged sets yet.</Text>
            ) : (
              <LineChart
                points={points.map((p) => ({ value: p.estOneRm }))}
                width={chartWidth}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    marginBottom: 10,
  },
  liftName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  liftValue: {
    color: colors.muted,
    fontSize: 13,
  },
  prBadge: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  emptyText: {
    color: colors.faint,
    fontSize: 13,
  },
});
