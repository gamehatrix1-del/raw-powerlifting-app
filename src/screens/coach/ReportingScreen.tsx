import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { addInterval } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";

interface TopLift {
  name: string;
  count: number;
}

export default function ReportingScreen() {
  const [totalAthletes, setTotalAthletes] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [topLifts, setTopLifts] = useState<TopLift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { count: athleteCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "athlete");
      setTotalAthletes(athleteCount ?? 0);

      const { data: paidPayments } = await supabase
        .from("payments")
        .select("athlete_id, amount_inr, paid_at, plans(billing_interval)")
        .eq("status", "paid");

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

      const { data: programExercises } = await supabase
        .from("program_exercises")
        .select("exercises(name)");

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

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Reporting</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activeMembers}</Text>
          <Text style={styles.statLabel}>Active members</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalAthletes}</Text>
          <Text style={styles.statLabel}>Total athletes</Text>
        </View>
      </View>

      <View style={styles.revenueCard}>
        <Text style={styles.statLabel}>This month's revenue</Text>
        <Text style={styles.revenueValue}>₹{monthRevenue}</Text>
      </View>

      <Text style={styles.sectionTitle}>Most-assigned lifts</Text>
      {topLifts.length === 0 ? (
        <Text style={styles.emptyText}>No programs built yet.</Text>
      ) : (
        topLifts.map((lift) => (
          <View key={lift.name} style={styles.liftRow}>
            <Text style={styles.liftName}>{lift.name}</Text>
            <Text style={styles.liftCount}>{lift.count}</Text>
          </View>
        ))
      )}
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
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
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
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  revenueCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
  },
  revenueValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
  },
  liftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  liftName: {
    color: colors.text,
  },
  liftCount: {
    color: colors.muted,
    fontWeight: "600",
  },
});
