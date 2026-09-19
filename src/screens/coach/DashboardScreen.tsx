import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, TextInput, View } from "react-native";
import AnimatedPressable from "../../components/AnimatedPressable";
import ErrorState from "../../components/ErrorState";
import { thisMonday } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { Profile } from "../../types/profile";

interface AthleteRow {
  profile: Profile;
  latestProgramWeek: string | null;
}

export default function DashboardScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const [rows, setRows] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);

    const { data: athletes, error: athletesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "athlete")
      .order("full_name", { ascending: true });

    if (athletesError) {
      console.error("Failed to load athletes", athletesError);
      setError(true);
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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.profile.full_name.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 64, paddingHorizontal: spacing.xxl }}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Athletes</Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <Ionicons name="search" size={18} color={colors.faint} />
        <TextInput
          style={{ flex: 1, color: colors.text, paddingHorizontal: spacing.sm, paddingVertical: 12, fontSize: 15 }}
          placeholder="Search athletes"
          placeholderTextColor={colors.faint}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <AnimatedPressable onPress={() => setSearch("")} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color={colors.faint} />
          </AnimatedPressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <ErrorState message="Couldn't load athletes." onRetry={load} />
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => item.profile.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.muted, textAlign: "center", marginTop: 40 }]}>
              {rows.length === 0 ? "No athletes have signed up yet." : "No athletes match your search."}
            </Text>
          }
          renderItem={({ item }) => {
            const status = statusFor(item);
            return (
              <AnimatedPressable
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.md,
                  padding: spacing.lg,
                  marginBottom: spacing.sm + 2,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onPress={() =>
                  navigation.navigate("AthleteDetail", {
                    athleteId: item.profile.id,
                    athleteName: item.profile.full_name,
                  })
                }
              >
                <Text style={[typography.bodyStrong, { color: colors.text, fontSize: 16 }]}>
                  {item.profile.full_name}
                </Text>
                <View
                  style={{
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    backgroundColor: status.tone === "warn" ? colors.warningMuted : colors.successMuted,
                  }}
                >
                  <Text
                    style={[
                      typography.micro,
                      { color: status.tone === "warn" ? colors.warning : colors.success, letterSpacing: 0 },
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          }}
        />
      )}
    </View>
  );
}
