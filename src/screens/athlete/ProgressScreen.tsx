import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
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

interface WeightPoint {
  date: string;
  weightKg: number;
}

function epleyOneRm(weight: number, reps: number) {
  return weight * (1 + reps / 30);
}

function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ProgressScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [series, setSeries] = useState<Record<string, SeriesPoint[]>>({});
  const [weightSeries, setWeightSeries] = useState<WeightPoint[]>([]);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    setLoading(true);
    setError(false);

    Promise.all([
      supabase
        .from("workout_logs")
        .select("weight, reps, logged_at, exercises(name)")
        .eq("athlete_id", session.user.id)
        .not("weight", "is", null)
        .not("reps", "is", null)
        .order("logged_at", { ascending: true }),
      supabase
        .from("bodyweight_logs")
        .select("weight_kg, logged_at")
        .eq("athlete_id", session.user.id)
        .order("logged_at", { ascending: true }),
    ]).then(([logsResult, weightResult]) => {
      if (logsResult.error) {
        console.error("Failed to load workout logs", logsResult.error);
        setError(true);
        setLoading(false);
        return;
      }
      if (weightResult.error) {
        console.error("Failed to load bodyweight logs", weightResult.error);
      }

      const byLift: Record<string, Map<string, number>> = {
        squat: new Map(),
        bench: new Map(),
        deadlift: new Map(),
      };

      for (const row of logsResult.data ?? []) {
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

      setWeightSeries(
        (weightResult.data ?? []).map((row) => ({ date: row.logged_at, weightKg: row.weight_kg }))
      );

      setLoading(false);
    });
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogWeight(weightKg: number) {
    if (!session) return;
    const today = todayDateKey();
    const { error: upsertError } = await supabase
      .from("bodyweight_logs")
      .upsert(
        { athlete_id: session.user.id, weight_kg: weightKg, logged_at: today },
        { onConflict: "athlete_id,logged_at" }
      );
    if (upsertError) {
      console.error("Failed to log bodyweight", upsertError);
      return;
    }
    setWeightSeries((prev) => {
      const withoutToday = prev.filter((p) => p.date !== today);
      return [...withoutToday, { date: today, weightKg }].sort((a, b) => (a.date < b.date ? -1 : 1));
    });
    setLogModalVisible(false);
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
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: spacing.xl, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[typography.display, { color: colors.text, fontSize: 26, marginBottom: spacing.lg }]}>Progress</Text>

      {total > 0 && (
        <View style={{ flexDirection: "row", gap: spacing.sm + 2, marginBottom: spacing.xl }}>
          <StatTile icon="calculator" value={`${total}kg`} label="Est. total" tone="accent" />
          <StatTile icon="trending-up" value={String(LIFTS.filter((l) => (series[l.key]?.length ?? 0) > 0).length)} label="Lifts tracked" tone="success" />
        </View>
      )}

      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md + 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm + 2 }}>
          <View
            style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: colors.accentMuted,
              alignItems: "center", justifyContent: "center",
              marginRight: spacing.sm + 2,
            }}
          >
            <Ionicons name="scale-outline" size={15} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.subheading, { color: colors.text }]}>Bodyweight</Text>
            {weightSeries.length > 0 && (
              <Text style={[typography.caption, { color: colors.muted, fontVariant: ["tabular-nums"], marginTop: 2 }]}>
                {weightSeries[weightSeries.length - 1].weightKg} kg latest
              </Text>
            )}
          </View>
          <AnimatedPressable
            style={{ backgroundColor: colors.accentMuted, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }}
            onPress={() => setLogModalVisible(true)}
          >
            <Text style={[typography.micro, { color: colors.accent, letterSpacing: 0, fontWeight: "700" }]}>Log weight</Text>
          </AnimatedPressable>
        </View>

        {weightSeries.length === 0 ? (
          <Text style={[typography.caption, { color: colors.faint }]}>No weigh-ins logged yet.</Text>
        ) : (
          <LineChart points={weightSeries.map((p) => ({ value: p.weightKg }))} width={chartWidth} />
        )}
      </View>

      {total === 0 ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xxl, alignItems: "center" }}>
          <Ionicons name="trending-up-outline" size={26} color={colors.faint} style={{ marginBottom: spacing.sm }} />
          <Text style={[typography.bodyStrong, { color: colors.text, marginBottom: 4, textAlign: "center" }]}>
            No lift trends yet
          </Text>
          <Text style={[typography.caption, { color: colors.muted, textAlign: "center" }]}>
            Estimated 1RM trends for squat, bench, and deadlift will show up here once you've logged sets for
            those lifts.
          </Text>
        </View>
      ) : (
        LIFTS.map((lift) => {
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
      })
      )}

      <LogWeightModal
        visible={logModalVisible}
        initialValue={weightSeries.length > 0 ? String(weightSeries[weightSeries.length - 1].weightKg) : ""}
        onClose={() => setLogModalVisible(false)}
        onSave={handleLogWeight}
      />
    </ScrollView>
  );
}

function LogWeightModal({
  visible,
  initialValue,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialValue: string;
  onClose: () => void;
  onSave: (weightKg: number) => Promise<void>;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setText(initialValue);
  }, [visible, initialValue]);

  const weight = Number(text);
  const valid = text.trim().length > 0 && !Number.isNaN(weight) && weight > 0;

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave(weight);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }}>
            <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.lg }]}>Today's Weight</Text>
            <TextInput
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                borderRadius: radius.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                fontSize: 15,
                marginBottom: spacing.lg,
              }}
              placeholder="Weight in kg"
              placeholderTextColor={colors.faint}
              keyboardType="decimal-pad"
              value={text}
              onChangeText={setText}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <AnimatedPressable
                style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center" }}
                onPress={onClose}
              >
                <Text style={[typography.bodyStrong, { color: colors.muted }]}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={{ flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", opacity: !valid ? 0.5 : 1 }}
                onPress={handleSave}
                disabled={!valid || saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Text style={[typography.bodyStrong, { color: colors.accentText }]}>Save</Text>
                )}
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
