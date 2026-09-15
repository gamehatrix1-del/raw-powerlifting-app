import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ErrorState from "../../components/ErrorState";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";
import { Exercise, ExerciseCategory } from "../../types/exercise";

const FILTERS: Array<ExerciseCategory | "all"> = [
  "all",
  "strength",
  "cardio",
  "mobility",
];

export default function LibraryScreen() {
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
    <View style={styles.container}>
      <Text style={styles.title}>Exercise Library</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search exercises"
        placeholderTextColor={colors.faint}
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === f && styles.filterChipTextActive,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <ErrorState message="Couldn't load exercises." onRetry={load} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No exercises match.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{item.name}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.category}</Text>
                </View>
              </View>
              {item.cue_text ? (
                <Text style={styles.cueText}>{item.cue_text}</Text>
              ) : null}
              {item.demo_video_url ? (
                <Pressable onPress={() => Linking.openURL(item.demo_video_url!)}>
                  <Text style={styles.videoLink}>▶ Watch demo</Text>
                </Pressable>
              ) : null}
            </View>
          )}
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
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  filterChipTextActive: {
    color: "#fff",
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
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cueText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 6,
  },
  videoLink: {
    color: colors.accent,
    fontSize: 13,
    marginTop: 8,
    fontWeight: "600",
  },
});
