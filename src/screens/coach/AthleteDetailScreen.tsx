import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";
import { AthleteProfile } from "../../types/profile";
import { Program } from "../../types/program";

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function AthleteDetailScreen({ route, navigation }: any) {
  const { athleteId, athleteName } = route.params as {
    athleteId: string;
    athleteName: string;
  };

  const [p, setP] = useState<AthleteProfile | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const [{ data: profileData }, { data: programsData }] = await Promise.all([
      supabase
        .from("athlete_profiles")
        .select("*")
        .eq("user_id", athleteId)
        .maybeSingle(),
      supabase
        .from("programs")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("week_start_date", { ascending: false }),
    ]);

    setP((profileData as AthleteProfile) ?? null);
    setPrograms((programsData as Program[]) ?? []);
    setLoading(false);
  }, [athleteId]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>{athleteName}</Text>

      <Pressable
        style={styles.buildButton}
        onPress={() =>
          navigation.navigate("ProgramBuilder", { athleteId, athleteName })
        }
      >
        <Text style={styles.buildButtonText}>Build Program</Text>
      </Pressable>

      {!p ? (
        <View style={styles.card}>
          <Text style={styles.rowValue}>Hasn't completed intake yet.</Text>
        </View>
      ) : (
        <>
          <Card title="Profile">
            <Row label="Age" value={p.age} />
            <Row label="Gender" value={p.gender} />
            <Row label="City" value={p.city} />
            <Row label="Height" value={p.height_cm ? `${p.height_cm} cm` : null} />
            <Row label="Bodyweight" value={p.bodyweight_kg ? `${p.bodyweight_kg} kg` : null} />
            <Row label="Body Fat" value={p.body_fat_pct ? `${p.body_fat_pct}%` : null} />
            <Row label="Weight Class" value={p.weight_class} />
            <Row label="Occupation" value={p.occupation} />
            <Row label="Training Exp." value={p.training_experience} />
            <Row label="PL Exp." value={p.powerlifting_experience} />
            <Row label="Federation" value={p.federation} />
            <Row label="Next Meet" value={p.meet_date} />
            <Row label="Meets Done" value={p.meets_done} />
            <Row label="Current Goal" value={p.current_goal} />
            <Row label="Training Days/Week" value={p.training_days_per_week} />
          </Card>

          <Card title="Best Lift Numbers (kg)">
            <Row label="Squat" value={fmtLift(p.squat_1rm, p.squat_best_3rm, p.squat_competition_pr)} />
            <Row label="Bench" value={fmtLift(p.bench_1rm, p.bench_best_3rm, p.bench_competition_pr)} />
            <Row label="Deadlift" value={fmtLift(p.deadlift_1rm, p.deadlift_best_3rm, p.deadlift_competition_pr)} />
          </Card>

          <Card title="Training & Recovery">
            <Row label="Training Time" value={p.training_time} />
            <Row label="Session Duration" value={p.session_duration} />
            <Row label="Wake / Sleep" value={p.wake_time || p.sleep_time ? `${p.wake_time ?? "—"} / ${p.sleep_time ?? "—"}` : null} />
            <Row label="Sleep Hours" value={p.sleep_hours} />
            <Row label="Recovery Tools" value={p.recovery_tools?.join(", ")} />
            <Row label="Stress" value={p.stress_level ? `${p.stress_level}/10` : null} />
            <Row label="Sleep Quality" value={p.sleep_quality ? `${p.sleep_quality}/10` : null} />
            <Row label="Recovery" value={p.recovery_level ? `${p.recovery_level}/10` : null} />
          </Card>

          <Card title="Technique">
            <Row label="Squat" value={joinNonEmpty([p.squat_style, p.squat_stance])} />
            <Row label="Bench" value={joinNonEmpty([p.bench_grip, p.bench_arch])} />
            <Row label="Deadlift" value={joinNonEmpty([p.deadlift_style, p.deadlift_grip])} />
          </Card>

          {(p.medical_conditions || p.past_surgeries) && (
            <Card title="Medical History">
              <Row label="Conditions / Medications" value={p.medical_conditions} />
              <Row label="Past Surgeries" value={p.past_surgeries} />
            </Card>
          )}

          {p.injuries_notes && (
            <Card title="Injury History">
              <Row label="Details" value={p.injuries_notes} />
            </Card>
          )}

          <Card title="Nutrition">
            <Row label="Diet Type" value={p.diet_type} />
            <Row label="Protein Intake" value={p.protein_intake_g ? `${p.protein_intake_g} g/day` : null} />
            <Row label="Water Intake" value={p.water_intake_l ? `${p.water_intake_l} L/day` : null} />
            <Row label="Allergies" value={p.food_allergies} />
            <Row label="Supplements" value={p.current_supplements} />
          </Card>

          <Card title="Equipment Access">
            <Row label="Available" value={p.equipment_access?.join(", ")} />
          </Card>

          {p.coaching_notes && (
            <Card title="Additional Notes">
              <Row label="Notes" value={p.coaching_notes} />
            </Card>
          )}
        </>
      )}

      <Text style={styles.sectionTitle}>Program history</Text>
      {programs.length === 0 ? (
        <Text style={styles.emptyText}>No programs assigned yet.</Text>
      ) : (
        programs.map((item) => (
          <View key={item.id} style={styles.programRow}>
            <Text style={styles.programName}>{item.name}</Text>
            <Text style={styles.programMeta}>
              Week of {item.week_start_date} · {item.status}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function fmtLift(oneRm: number | null, threeRm: number | null, compPr: number | null) {
  const parts = [];
  if (oneRm) parts.push(`1RM ${oneRm}`);
  if (threeRm) parts.push(`3RM ${threeRm}`);
  if (compPr) parts.push(`Comp PR ${compPr}`);
  return parts.length ? parts.join(" · ") : null;
}

function joinNonEmpty(values: (string | null)[]) {
  const filtered = values.filter(Boolean);
  return filtered.length ? filtered.join(" · ") : null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  rowValue: {
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
    textAlign: "right",
  },
  buildButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  buildButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 10,
  },
  emptyText: {
    color: colors.muted,
  },
  programRow: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  programName: {
    color: colors.text,
    fontWeight: "600",
  },
  programMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
