import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
import EmptyState from "../../components/EmptyState";
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

export default function LibraryScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ExerciseCategory | "all">("all");
  const [selected, setSelected] = useState<Exercise | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    supabase
      .from("exercises")
      .select("*")
      .eq("is_active", true)
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
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

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
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 20, paddingHorizontal: spacing.xl }}>
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
          ListEmptyComponent={<EmptyState icon="barbell-outline" message="No exercises match" />}
          renderItem={({ item }) => (
            <AnimatedPressable
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.md,
                padding: spacing.lg,
                marginBottom: spacing.sm + 2,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={() => setSelected(item)}
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
                  <Text style={[typography.caption, { color: colors.muted, marginTop: 6 }]} numberOfLines={1}>
                    {item.cue_text}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} style={{ marginLeft: spacing.sm }} />
            </AnimatedPressable>
          )}
        />
      )}

      <ExerciseDetailModal exercise={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

function ExerciseDetailModal({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!exercise} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl, maxHeight: "80%" }}>
          {exercise && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.lg }} />

              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.lg }}>
                <View
                  style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: colors.accentMuted,
                    alignItems: "center", justifyContent: "center",
                    marginRight: spacing.md,
                  }}
                >
                  <Ionicons name={CATEGORY_ICONS[exercise.category]} size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.title, { color: colors.text, fontSize: 20 }]}>{exercise.name}</Text>
                  <Text style={[typography.caption, { color: colors.muted, marginTop: 2, textTransform: "capitalize" }]}>
                    {exercise.category}
                  </Text>
                </View>
              </View>

              {exercise.cue_text ? (
                <View style={{ backgroundColor: colors.accentMuted, borderRadius: radius.md, padding: spacing.md + 2, marginBottom: spacing.lg }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Ionicons name="bulb-outline" size={14} color={colors.accent} />
                    <Text style={[typography.micro, { color: colors.accent, letterSpacing: 0.5 }]}>COACHING CUE</Text>
                  </View>
                  <Text style={[typography.body, { color: colors.text, lineHeight: 21 }]}>{exercise.cue_text}</Text>
                </View>
              ) : (
                <Text style={[typography.caption, { color: colors.faint, marginBottom: spacing.lg }]}>
                  No coaching notes added for this exercise yet.
                </Text>
              )}

              {exercise.demo_video_url ? (
                <AnimatedPressable
                  style={{
                    backgroundColor: colors.accent,
                    borderRadius: radius.md,
                    paddingVertical: spacing.md + 2,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: spacing.sm,
                    marginBottom: spacing.md,
                  }}
                  onPress={() => Linking.openURL(exercise.demo_video_url!)}
                >
                  <Ionicons name="play-circle" size={18} color={colors.accentText} />
                  <Text style={[typography.bodyStrong, { color: colors.accentText }]}>Watch demo</Text>
                </AnimatedPressable>
              ) : null}

              <AnimatedPressable
                style={{ paddingVertical: spacing.md, alignItems: "center" }}
                onPress={onClose}
              >
                <Text style={[typography.bodyStrong, { color: colors.muted }]}>Close</Text>
              </AnimatedPressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
