import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import ErrorState from "../../components/ErrorState";
import StatTile from "../../components/StatTile";
import { addInterval, formatDisplayDate } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface TopLift {
  name: string;
  count: number;
}

export default function ReportingScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const alert = useAppAlert();
  const [totalAthletes, setTotalAthletes] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [topLifts, setTopLifts] = useState<TopLift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  async function handleExportTransactions() {
    setExporting(true);
    try {
      const { data, error: exportError } = await supabase
        .from("payments")
        .select("created_at, paid_at, amount_inr, status, razorpay_payment_id, profiles(full_name), plans(name)")
        .order("created_at", { ascending: false });
      if (exportError) throw exportError;

      const header = "Date,Athlete,Plan,Amount (INR),Status,Payment ID";
      const rows = (data ?? []).map((row: any) => {
        const date = row.paid_at ?? row.created_at;
        return [
          csvEscape(formatDisplayDate(date)),
          csvEscape(row.profiles?.full_name ?? "—"),
          csvEscape(row.plans?.name ?? "—"),
          String(row.amount_inr),
          csvEscape(row.status),
          csvEscape(row.razorpay_payment_id ?? "—"),
        ].join(",");
      });
      const csv = [header, ...rows].join("\n");

      const fileName = `rpa-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      const file = new File(Paths.cache, fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          dialogTitle: "Save transaction history",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        alert("Export ready", `Saved to ${file.uri}`);
      }
    } catch (err: any) {
      alert("Couldn't export transactions", err.message ?? "Please try again.");
    } finally {
      setExporting(false);
    }
  }

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
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.xl }}>
        <Text style={[typography.display, { color: colors.text, fontSize: 26, flex: 1 }]}>Reporting</Text>
        <AnimatedPressable
          onPress={handleExportTransactions}
          disabled={exporting}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.card,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: 8,
          }}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="download-outline" size={15} color={colors.accent} />
          )}
          <Text style={[typography.micro, { color: colors.accent, letterSpacing: 0, fontWeight: "700" }]}>Export</Text>
        </AnimatedPressable>
      </View>

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
