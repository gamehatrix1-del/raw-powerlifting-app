import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import AnimatedPressable from "../../components/AnimatedPressable";
import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { formatDisplayDate, thisMonday } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { Program } from "../../types/program";

export default function ProgramHistoryListScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const { session } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(false);

    // Strictly before this week — the current week already has its own
    // live view on the Program tab, so it shouldn't also show up here.
    const { data, error: loadError } = await supabase
      .from("programs")
      .select("*")
      .eq("athlete_id", session.user.id)
      .lt("week_start_date", thisMonday())
      .order("week_start_date", { ascending: false });

    if (loadError) {
      console.error("Failed to load program history", loadError);
      setError(true);
      setLoading(false);
      return;
    }

    setPrograms((data as Program[]) ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

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
        <ErrorState message="Couldn't load your program history." onRetry={load} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 20, paddingHorizontal: spacing.xl }}>
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.muted, textAlign: "center", marginTop: 40 }]}>
            No past programs yet.
          </Text>
        }
        renderItem={({ item }) => (
          <AnimatedPressable
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: spacing.md + 2,
              marginBottom: spacing.sm,
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={() =>
              navigation.navigate("ProgramHistoryDetail", {
                programId: item.id,
                programName: item.name,
                weekStartDate: item.week_start_date,
                status: item.status,
              })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>{item.name}</Text>
              <Text style={[typography.caption, { color: colors.muted, marginTop: 2 }]}>
                Week of {formatDisplayDate(item.week_start_date)} · {item.status}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </AnimatedPressable>
        )}
      />
    </View>
  );
}
