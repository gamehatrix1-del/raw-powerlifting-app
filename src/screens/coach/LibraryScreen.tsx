import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { Exercise, ExerciseCategory } from "../../types/exercise";

const CATEGORIES: ExerciseCategory[] = ["strength", "cardio", "mobility"];

const CATEGORY_ICONS: Record<ExerciseCategory, keyof typeof Ionicons.glyphMap> = {
  strength: "barbell",
  cardio: "heart",
  mobility: "body",
};

export default function LibraryScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const alert = useAppAlert();
  const { session } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: loadError } = await supabase
      .from("exercises")
      .select("*")
      .order("name", { ascending: true });
    if (loadError) {
      console.error("Failed to load exercises", loadError);
      setError(true);
    } else {
      setExercises((data as Exercise[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, search]);

  function openCreate() {
    setEditingExercise(null);
    setModalVisible(true);
  }

  function openEdit(exercise: Exercise) {
    setEditingExercise(exercise);
    setModalVisible(true);
  }

  async function handleSave(input: {
    name: string;
    category: ExerciseCategory;
    cueText: string;
    demoVideoUrl: string;
  }) {
    if (!session) return;

    if (editingExercise) {
      const { error } = await supabase
        .from("exercises")
        .update({
          name: input.name,
          category: input.category,
          cue_text: input.cueText || null,
          demo_video_url: input.demoVideoUrl || null,
        })
        .eq("id", editingExercise.id);
      if (error) {
        alert("Couldn't update exercise", error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("exercises").insert({
        name: input.name,
        category: input.category,
        cue_text: input.cueText || null,
        demo_video_url: input.demoVideoUrl || null,
        created_by: session.user.id,
      });
      if (error) {
        alert("Couldn't add exercise", error.message);
        return;
      }
    }
    setModalVisible(false);
    setEditingExercise(null);
    loadExercises();
  }

  async function handleDelete(exercise: Exercise) {
    const { error } = await supabase.from("exercises").delete().eq("id", exercise.id);
    if (error) {
      alert("Couldn't delete exercise", error.message);
      return;
    }
    setModalVisible(false);
    setEditingExercise(null);
    loadExercises();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 20, paddingHorizontal: spacing.xxl }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <Text style={[typography.title, { color: colors.text }]}>Exercise Library</Text>
        <AnimatedPressable
          style={{ backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm }}
          onPress={openCreate}
        >
          <Text style={[typography.caption, { color: colors.accentText, fontWeight: "700" }]}>+ Add</Text>
        </AnimatedPressable>
      </View>

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
          placeholder="Search exercises"
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
        <ErrorState message="Couldn't load exercises." onRetry={loadExercises} />
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.muted, textAlign: "center", marginTop: 40 }]}>
              {exercises.length === 0 ? "No exercises yet. Add the first one." : "No exercises match your search."}
            </Text>
          }
          renderItem={({ item }) => (
            <AnimatedPressable
              style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm + 2, flexDirection: "row", alignItems: "center" }}
              onPress={() => openEdit(item)}
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
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} style={{ marginLeft: spacing.sm }} />
            </AnimatedPressable>
          )}
        />
      )}

      <ExerciseModal
        visible={modalVisible}
        exercise={editingExercise}
        onClose={() => {
          setModalVisible(false);
          setEditingExercise(null);
        }}
        onSubmit={handleSave}
        onDelete={editingExercise ? () => handleDelete(editingExercise) : undefined}
      />
    </View>
  );
}

function ExerciseModal({
  visible,
  exercise,
  onClose,
  onSubmit,
  onDelete,
}: {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    category: ExerciseCategory;
    cueText: string;
    demoVideoUrl: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const alert = useAppAlert();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("strength");
  const [cueText, setCueText] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(exercise?.name ?? "");
      setCategory(exercise?.category ?? "strength");
      setCueText(exercise?.cue_text ?? "");
      setDemoVideoUrl(exercise?.demo_video_url ?? "");
    }
  }, [visible, exercise]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), category, cueText, demoVideoUrl });
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete() {
    if (!onDelete) return;
    alert("Delete this exercise?", "It will be removed from the library. Programs that already use it keep their existing entries.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await onDelete();
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  const inputStyle = {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    marginBottom: spacing.md,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl, maxHeight: "85%" }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
            <Text style={[typography.heading, { color: colors.text }]}>
              {exercise ? "Edit Exercise" : "New Exercise"}
            </Text>
            {onDelete ? (
              <AnimatedPressable onPress={confirmDelete} disabled={deleting} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {deleting ? (
                  <ActivityIndicator color={colors.error} size="small" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text style={[typography.caption, { color: colors.error, fontWeight: "700" }]}>Delete</Text>
                  </>
                )}
              </AnimatedPressable>
            ) : null}
          </View>

          <TextInput
            style={inputStyle}
            placeholder="Name"
            placeholderTextColor={colors.faint}
            value={name}
            onChangeText={setName}
          />

          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
            {CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <AnimatedPressable
                  key={cat}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm + 2,
                    borderRadius: radius.sm,
                    alignItems: "center",
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: active ? colors.accent : "transparent",
                  }}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: active ? colors.text : colors.muted, fontWeight: "600", textTransform: "capitalize" },
                    ]}
                  >
                    {cat}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          <TextInput
            style={inputStyle}
            placeholder="Cue text (optional)"
            placeholderTextColor={colors.faint}
            value={cueText}
            onChangeText={setCueText}
          />
          <TextInput
            style={inputStyle}
            placeholder="Demo video URL (optional)"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            value={demoVideoUrl}
            onChangeText={setDemoVideoUrl}
          />

          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xs }}>
            <AnimatedPressable
              style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center" }}
              onPress={onClose}
            >
              <Text style={[typography.bodyStrong, { color: colors.muted }]}>Cancel</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={{
                flex: 1,
                backgroundColor: colors.accent,
                borderRadius: radius.md,
                paddingVertical: spacing.lg,
                alignItems: "center",
                opacity: !name ? 0.5 : 1,
              }}
              onPress={handleSubmit}
              disabled={!name || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accentText} />
              ) : (
                <Text style={[typography.bodyStrong, { color: colors.accentText }]}>Save</Text>
              )}
            </AnimatedPressable>
          </View>
        </ScrollView>
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
