import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";
import { AthleteProfile } from "../../types/profile";
import { Program } from "../../types/program";

export default function AthleteDetailScreen({ route, navigation }: any) {
  const { athleteId, athleteName } = route.params as {
    athleteId: string;
    athleteName: string;
  };

  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(
    null
  );
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

    setAthleteProfile((profileData as AthleteProfile) ?? null);
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
    <View style={styles.container}>
      <Text style={styles.title}>{athleteName}</Text>

      {athleteProfile ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Lifts (1RM, kg)</Text>
          <Text style={styles.bodyText}>
            Squat {athleteProfile.squat_1rm ?? "—"} · Bench{" "}
            {athleteProfile.bench_1rm ?? "—"} · Deadlift{" "}
            {athleteProfile.deadlift_1rm ?? "—"}
          </Text>
          <Text style={styles.sectionLabel}>Squat style</Text>
          <Text style={styles.bodyText}>
            {athleteProfile.squat_style ?? "—"}
          </Text>
          <Text style={styles.sectionLabel}>Equipment</Text>
          <Text style={styles.bodyText}>
            {athleteProfile.equipment_access ?? "—"}
          </Text>
          {athleteProfile.injuries_notes ? (
            <>
              <Text style={styles.sectionLabel}>Injuries</Text>
              <Text style={styles.bodyText}>
                {athleteProfile.injuries_notes}
              </Text>
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.bodyText}>Hasn't completed intake yet.</Text>
        </View>
      )}

      <Pressable
        style={styles.buildButton}
        onPress={() =>
          navigation.navigate("ProgramBuilder", { athleteId, athleteName })
        }
      >
        <Text style={styles.buildButtonText}>Build Program</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Program history</Text>
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No programs assigned yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.programRow}>
            <Text style={styles.programName}>{item.name}</Text>
            <Text style={styles.programMeta}>
              Week of {item.week_start_date} · {item.status}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 24,
    paddingHorizontal: 24,
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
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
  },
  bodyText: {
    color: colors.text,
    fontSize: 14,
    marginTop: 2,
  },
  buildButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
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
