import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import ErrorState from "../../components/ErrorState";
import LineChart from "../../components/LineChart";
import StatTile from "../../components/StatTile";
import { useAuth } from "../../context/AuthContext";
import { dateKey } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";

const LIFTS = [
  { key: "squat", label: "Squat", match: "squat", icon: "body" as const },
  { key: "bench", label: "Bench", match: "bench", icon: "barbell" as const },
  { key: "deadlift", label: "Deadlift", match: "deadlift", icon: "fitness" as const },
];

interface SeriesPoint {
  date: string;
  estOneRm: number;
}

function epleyOneRm(weight: number, reps: number) {
  return weight * (1 + reps / 30);
}

export default function ProgressScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [series, setSeries] = useState<Record<string, SeriesPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    setLoading(true);
    setError(false);

    supabase
      .from("workout_logs")
      .select("weight, reps, logged_at, exercises(name)")
      .eq("athlete_id", session.user.id)
      .not("weight", "is", null)
      .not("reps", "is", null)
      .order("logged_at", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (loadError) {
          console.error("Failed to load workout logs", loadError);
          setError(true);
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

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ErrorState message="Couldn't load progress." onRetry={load} />
      </View>
    );
  }

  const chartWidth = width - spacing.xl * 2 - spacing.lg * 2;
  const totals = LIFTS.map((lift) => {
    const points = series[lift.key] ?? [];
    return points.length ? Math.round(points[points.length - 1].estOneRm) : 0;
  });
  const total = totals.reduce((a, b) => a + b, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[typography.display, { color: colors.text, fontSize: 26, marginBottom: spacing.lg }]}>Progress</Text>

      <View style={{ flexDirection: "row", gap: spacing.sm + 2, marginBottom: spacing.xl }}>
        <StatTile icon="calculator" value={total ? `${total}kg` : "—"} label="Est. total" tone="accent" />
        <StatTile icon="trending-up" value={String(LIFTS.filter((l) => (series[l.key]?.length ?? 0) > 0).length)} label="Lifts tracked" tone="success" />
      </View>

      {LIFTS.map((lift) => {
        const points = series[lift.key] ?? [];
        const latest = points[points.length - 1];
        const isPr =
          points.length > 0 &&
          latest.estOneRm === Math.max(...points.map((p) => p.estOneRm));

        return (
          <View
            key={lift.key}
            style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md + 2 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm + 2 }}>
              <View
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: colors.accentMuted,
                  alignItems: "center", justifyContent: "center",
                  marginRight: spacing.sm + 2,
                }}
              >
                <Ionicons name={lift.icon} size={15} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.subheading, { color: colors.text }]}>{lift.label}</Text>
                {latest && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 }}>
                    <Text style={[typography.caption, { color: colors.muted, fontVariant: ["tabular-nums"] }]}>
                      {Math.round(latest.estOneRm)} kg est. 1RM
                    </Text>
                  </View>
                )}
              </View>
              {isPr && points.length > 1 && (
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, gap: 4 }}>
                  <Ionicons name="trophy" size={11} color={colors.accentText} />
                  <Text style={[typography.micro, { color: colors.accentText }]}>PR</Text>
                </View>
              )}
            </View>

            {points.length === 0 ? (
              <Text style={[typography.caption, { color: colors.faint }]}>No logged sets yet.</Text>
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
