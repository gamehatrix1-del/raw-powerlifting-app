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
import { thisMonday } from "../../lib/dates";
import { colors } from "../../theme/colors";
import { Profile } from "../../types/profile";

interface AthleteRow {
  profile: Profile;
  latestProgramWeek: string | null;
}

export default function DashboardScreen({ navigation }: any) {
  const [rows, setRows] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: athletes, error: athletesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "athlete")
      .order("full_name", { ascending: true });

    if (athletesError) {
      console.error("Failed to load athletes", athletesError);
      setLoading(false);
      return;
    }

    const { data: programs, error: programsError } = await supabase
      .from("programs")
      .select("athlete_id, week_start_date")
      .order("week_start_date", { ascending: false });

    if (programsError) {
      console.error("Failed to load programs", programsError);
    }

    const latestByAthlete = new Map<string, string>();
    for (const p of programs ?? []) {
      if (!latestByAthlete.has(p.athlete_id)) {
        latestByAthlete.set(p.athlete_id, p.week_start_date);
      }
    }

    setRows(
      ((athletes as Profile[]) ?? []).map((profile) => ({
        profile,
        latestProgramWeek: latestByAthlete.get(profile.id) ?? null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  function statusFor(row: AthleteRow) {
    if (!row.latestProgramWeek) {
      return { label: "No program yet", tone: "warn" as const };
    }
    if (row.latestProgramWeek < thisMonday()) {
      return { label: "Needs next week's program", tone: "warn" as const };
    }
    return { label: "Up to date", tone: "ok" as const };
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Athletes</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.profile.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No athletes have signed up yet.</Text>
          }
          renderItem={({ item }) => {
            const status = statusFor(item);
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  navigation.navigate("AthleteDetail", {
                    athleteId: item.profile.id,
                    athleteName: item.profile.full_name,
                  })
                }
              >
                <Text style={styles.name}>{item.profile.full_name}</Text>
                <View
                  style={[
                    styles.chip,
                    status.tone === "warn" ? styles.chipWarn : styles.chipOk,
                  ]}
                >
                  <Text style={styles.chipText}>{status.label}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
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
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyText: {
    color: colors.muted,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  chip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipWarn: {
    backgroundColor: "rgba(227,58,58,0.15)",
  },
  chipOk: {
    backgroundColor: "rgba(80,200,120,0.15)",
  },
  chipText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
});
