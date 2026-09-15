import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";
import { Exercise, ExerciseCategory } from "../../types/exercise";

const CATEGORIES: ExerciseCategory[] = ["strength", "cardio", "mobility"];

export default function LibraryScreen() {
  const { session } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("Failed to load exercises", error);
    } else {
      setExercises((data as Exercise[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  async function handleCreate(input: {
    name: string;
    category: ExerciseCategory;
    cueText: string;
    demoVideoUrl: string;
  }) {
    if (!session) return;
    const { error } = await supabase.from("exercises").insert({
      name: input.name,
      category: input.category,
      cue_text: input.cueText || null,
      demo_video_url: input.demoVideoUrl || null,
      created_by: session.user.id,
    });
    if (error) {
      Alert.alert("Couldn't add exercise", error.message);
      return;
    }
    setModalVisible(false);
    loadExercises();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercise Library</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No exercises yet. Add the first one.
            </Text>
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
            </View>
          )}
        />
      )}

      <AddExerciseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreate}
      />
    </View>
  );
}

function AddExerciseModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    category: ExerciseCategory;
    cueText: string;
    demoVideoUrl: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("strength");
  const [cueText, setCueText] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setCategory("strength");
    setCueText("");
    setDemoVideoUrl("");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), category, cueText, demoVideoUrl });
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New Exercise</Text>

          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={colors.faint}
            value={name}
            onChangeText={setName}
          />

          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryOption,
                  category === cat && styles.categoryOptionActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    category === cat && styles.categoryOptionTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Cue text (optional)"
            placeholderTextColor={colors.faint}
            value={cueText}
            onChangeText={setCueText}
          />
          <TextInput
            style={styles.input}
            placeholder="Demo video URL (optional)"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            value={demoVideoUrl}
            onChangeText={setDemoVideoUrl}
          />

          <View style={styles.modalFooter}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, !name && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!name || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  categoryOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: "transparent",
  },
  categoryOptionActive: {
    borderColor: colors.accent,
  },
  categoryOptionText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  categoryOptionTextActive: {
    color: colors.text,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
