import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Text,
  TextInput,
  View,
} from "react-native";
import AnimatedPressable from "../../components/AnimatedPressable";
import ErrorState from "../../components/ErrorState";
import SegmentedControl from "../../components/SegmentedControl";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { Exercise, ExerciseCategory } from "../../types/exercise";

const FILTERS: Array<ExerciseCategory | "all"> = [
  "all",
  "strength",
  "cardio",
  "mobility",
];

const CATEGORY_ICONS: Record<ExerciseCategory, keyof typeof Ionicons.glyphMap> = {
  strength: "barbell",
  cardio: "heart",
  mobility: "body",
};

export default function LibraryScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ExerciseCategory | "all">("all");

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    supabase
      .from("exercises")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (loadError) {
          console.error("Failed to load exercises", loadError);
          setError(true);
        } else {
          setExercises((data as Exercise[]) ?? []);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      exercises.filter(
        (e) =>
          (filter === "all" || e.category === filter) &&
          e.name.toLowerCase().includes(search.toLowerCase())
      ),
    [exercises, search, filter]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 64, paddingHorizontal: spacing.xl }}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>
        Exercise Library
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <Ionicons name="search" size={18} color={colors.faint} />
        <TextInput
          style={{ flex: 1, color: colors.text, paddingHorizontal: spacing.sm, paddingVertical: 12, fontSize: 15 }}
          placeholder="Search exercises"
          placeholderTextColor={colors.faint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={{ marginBottom: spacing.lg }}>
        <SegmentedControl
          options={FILTERS.map((f) => ({ label: f[0].toUpperCase() + f.slice(1), value: f }))}
          value={filter}
          onChange={(v) => setFilter(v as ExerciseCategory | "all")}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <ErrorState message="Couldn't load exercises." onRetry={load} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.muted, textAlign: "center", marginTop: 40 }]}>
              No exercises match.
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.md,
                padding: spacing.lg,
                marginBottom: spacing.sm + 2,
                flexDirection: "row",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.accentMuted,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: spacing.md,
                }}
              >
                <Ionicons name={CATEGORY_ICONS[item.category]} size={17} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[typography.subheading, { color: colors.text, flex: 1 }]}>{item.name}</Text>
                  <View style={{ backgroundColor: colors.background, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={[typography.micro, { color: colors.muted, textTransform: "uppercase" }]}>
                      {item.category}
                    </Text>
                  </View>
                </View>
                {item.cue_text ? (
                  <Text style={[typography.caption, { color: colors.muted, marginTop: 6 }]}>{item.cue_text}</Text>
                ) : null}
                {item.demo_video_url ? (
                  <AnimatedPressable
                    style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: 4 }}
                    onPress={() => Linking.openURL(item.demo_video_url!)}
                  >
                    <Ionicons name="play-circle" size={16} color={colors.accent} />
                    <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>
                      Watch demo
                    </Text>
                  </AnimatedPressable>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
