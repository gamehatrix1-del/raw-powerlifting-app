import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ErrorState from "../../components/ErrorState";
import StatTile from "../../components/StatTile";
import { addInterval } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";

interface TopLift {
  name: string;
  count: number;
}

export default function ReportingScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [totalAthletes, setTotalAthletes] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [topLifts, setTopLifts] = useState<TopLift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { count: athleteCount, error: athleteError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "athlete");
      if (athleteError) throw athleteError;
      setTotalAthletes(athleteCount ?? 0);

      const { data: paidPayments, error: paymentsError } = await supabase
        .from("payments")
        .select("athlete_id, amount_inr, paid_at, plans(billing_interval)")
        .eq("status", "paid");
      if (paymentsError) throw paymentsError;

      const today = new Date().toISOString().slice(0, 10);
      const activeAthleteIds = new Set<string>();
      let revenue = 0;
      const now = new Date();

      for (const row of paidPayments ?? []) {
        if (!row.paid_at) continue;
        const interval = (row.plans as any)?.billing_interval ?? "monthly";
        const renewsAt = addInterval(row.paid_at, interval);
        if (renewsAt >= today) activeAthleteIds.add(row.athlete_id);

        const paidDate = new Date(row.paid_at);
        if (
          paidDate.getMonth() === now.getMonth() &&
          paidDate.getFullYear() === now.getFullYear()
        ) {
          revenue += row.amount_inr;
        }
      }
      setActiveMembers(activeAthleteIds.size);
      setMonthRevenue(revenue);

      const { data: programExercises, error: exercisesError } = await supabase
        .from("program_exercises")
        .select("exercises(name)");
      if (exercisesError) throw exercisesError;

      const counts = new Map<string, number>();
      for (const row of programExercises ?? []) {
        const name = (row.exercises as any)?.name;
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
      setTopLifts(
        [...counts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );
    } catch (err) {
      console.error("Failed to load reporting data", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

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
        <ErrorState message="Couldn't load reporting data." onRetry={load} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: spacing.xxl, paddingBottom: 40 }}
    >
      <Text style={[typography.display, { color: colors.text, fontSize: 26, marginBottom: spacing.xl }]}>Reporting</Text>

      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md }}>
        <StatTile icon="people" value={String(activeMembers)} label="Active members" tone="success" />
        <StatTile icon="person-add" value={String(totalAthletes)} label="Total athletes" tone="accent" />
      </View>

      <View style={{ borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xxl + 4, backgroundColor: colors.card, flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: colors.accentMuted,
            alignItems: "center", justifyContent: "center",
            marginRight: spacing.md,
          }}
        >
          <Text style={{ fontSize: 18 }}>₹</Text>
        </View>
        <View>
          <Text style={[typography.caption, { color: colors.muted }]}>This month's revenue</Text>
          <Text style={[typography.display, { color: colors.text, fontSize: 24, marginTop: 2, fontVariant: ["tabular-nums"] }]}>
            ₹{monthRevenue.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.sm + 2 }]}>Most-assigned lifts</Text>
      {topLifts.length === 0 ? (
        <Text style={[typography.caption, { color: colors.muted }]}>No programs built yet.</Text>
      ) : (
        topLifts.map((lift, i) => (
          <View
            key={lift.name}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: spacing.md + 2,
              marginBottom: spacing.sm,
            }}
          >
            <View
              style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: colors.accentMuted,
                alignItems: "center", justifyContent: "center",
                marginRight: spacing.sm + 2,
              }}
            >
              <Text style={[typography.micro, { color: colors.accent, letterSpacing: 0 }]}>{i + 1}</Text>
            </View>
            <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{lift.name}</Text>
            <Text style={[typography.bodyStrong, { color: colors.muted }]}>{lift.count}×</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
