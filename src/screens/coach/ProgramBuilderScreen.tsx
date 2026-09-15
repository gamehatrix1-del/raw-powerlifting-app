import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { thisMonday } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";
import { Exercise } from "../../types/exercise";

interface DraftExercise {
  tempId: string;
  exerciseId: string;
  exerciseName: string;
  sets: string;
  reps: string;
  targetLoad: string;
  targetRpe: string;
  tempoNote: string;
}

interface DraftDay {
  dayNumber: number;
  label: string;
  isRestDay: boolean;
  exercises: DraftExercise[];
}

function emptyDays(): DraftDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayNumber: i + 1,
    label: `Day ${i + 1}`,
    isRestDay: false,
    exercises: [],
  }));
}

export default function ProgramBuilderScreen({ route, navigation }: any) {
  const { athleteId, athleteName } = route.params as {
    athleteId: string;
    athleteName: string;
  };
  const { session } = useAuth();

  const [programName, setProgramName] = useState(`Week of ${thisMonday()}`);
  const [weekStartDate, setWeekStartDate] = useState(thisMonday());
  const [days, setDays] = useState<DraftDay[]>(emptyDays());
  const [activeDay, setActiveDay] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    supabase
      .from("exercises")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Failed to load exercises", error);
        setExercises((data as Exercise[]) ?? []);
      });
  }, []);

  const currentDay = days[activeDay];

  function updateDay(index: number, patch: Partial<DraftDay>) {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  }

  function addExerciseToCurrentDay(draft: DraftExercise) {
    updateDay(activeDay, {
      exercises: [...currentDay.exercises, draft],
    });
  }

  function removeExercise(tempId: string) {
    updateDay(activeDay, {
      exercises: currentDay.exercises.filter((e) => e.tempId !== tempId),
    });
  }

  async function handleCopyLastWeek() {
    setCopying(true);
    try {
      const { data: lastProgram, error: programError } = await supabase
        .from("programs")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("week_start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (programError) throw programError;
      if (!lastProgram) {
        Alert.alert("No previous program", "This athlete has no prior week to copy.");
        return;
      }

      const { data: lastDays, error: daysError } = await supabase
        .from("program_days")
        .select("*")
        .eq("program_id", lastProgram.id)
        .order("day_number", { ascending: true });
      if (daysError) throw daysError;

      const { data: lastExercises, error: exercisesError } = await supabase
        .from("program_exercises")
        .select("*, exercises(name)")
        .in("program_day_id", (lastDays ?? []).map((d) => d.id))
        .order("order_index", { ascending: true });
      if (exercisesError) throw exercisesError;

      const nextDays: DraftDay[] = (lastDays ?? []).map((d) => ({
        dayNumber: d.day_number,
        label: d.day_label,
        isRestDay: d.is_rest_day,
        exercises: (lastExercises ?? [])
          .filter((e: any) => e.program_day_id === d.id)
          .map((e: any) => ({
            tempId: `${e.id}-${Math.random()}`,
            exerciseId: e.exercise_id,
            exerciseName: e.exercises?.name ?? "Exercise",
            sets: String(e.sets),
            reps: e.reps,
            targetLoad: e.target_load ?? "",
            targetRpe: e.target_rpe != null ? String(e.target_rpe) : "",
            tempoNote: e.tempo_note ?? "",
          })),
      }));

      setDays(nextDays.length === 7 ? nextDays : emptyDays());
    } catch (err: any) {
      Alert.alert("Couldn't copy last week", err.message ?? "Please try again.");
    } finally {
      setCopying(false);
    }
  }

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    try {
      const { data: program, error: programError } = await supabase
        .from("programs")
        .insert({
          athlete_id: athleteId,
          coach_id: session.user.id,
          name: programName,
          week_start_date: weekStartDate,
          status: "active",
        })
        .select()
        .single();
      if (programError) throw programError;

      const { data: insertedDays, error: daysError } = await supabase
        .from("program_days")
        .insert(
          days.map((d) => ({
            program_id: program.id,
            day_number: d.dayNumber,
            day_label: d.label,
            is_rest_day: d.isRestDay,
          }))
        )
        .select();
      if (daysError) throw daysError;

      const exerciseRows = days.flatMap((d) => {
        const dayRow = (insertedDays ?? []).find(
          (row: any) => row.day_number === d.dayNumber
        );
        if (!dayRow) return [];
        return d.exercises.map((e, index) => ({
          program_day_id: dayRow.id,
          exercise_id: e.exerciseId,
          order_index: index,
          sets: Number(e.sets) || 1,
          reps: e.reps || "-",
          target_load: e.targetLoad || null,
          target_rpe: e.targetRpe ? Number(e.targetRpe) : null,
          tempo_note: e.tempoNote || null,
        }));
      });

      if (exerciseRows.length > 0) {
        const { error: exercisesError } = await supabase
          .from("program_exercises")
          .insert(exerciseRows);
        if (exercisesError) throw exercisesError;
      }

      Alert.alert("Program assigned", `${athleteName}'s week is live.`);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Couldn't save program", err.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Build week for {athleteName}</Text>

        <TextInput
          style={styles.input}
          value={programName}
          onChangeText={setProgramName}
          placeholder="Program name"
          placeholderTextColor={colors.faint}
        />
        <TextInput
          style={styles.input}
          value={weekStartDate}
          onChangeText={setWeekStartDate}
          placeholder="Week start (YYYY-MM-DD)"
          placeholderTextColor={colors.faint}
        />

        <Pressable
          style={styles.copyButton}
          onPress={handleCopyLastWeek}
          disabled={copying}
        >
          {copying ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.copyButtonText}>Copy last week</Text>
          )}
        </Pressable>

        <View style={styles.dayTabs}>
          {days.map((d, i) => (
            <Pressable
              key={d.dayNumber}
              style={[styles.dayTab, activeDay === i && styles.dayTabActive]}
              onPress={() => setActiveDay(i)}
            >
              <Text
                style={[
                  styles.dayTabText,
                  activeDay === i && styles.dayTabTextActive,
                ]}
              >
                {d.dayNumber}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.input}
          value={currentDay.label}
          onChangeText={(text) => updateDay(activeDay, { label: text })}
          placeholder="Day label"
          placeholderTextColor={colors.faint}
        />

        <Pressable
          style={styles.restToggle}
          onPress={() =>
            updateDay(activeDay, { isRestDay: !currentDay.isRestDay })
          }
        >
          <Text style={styles.restToggleText}>
            {currentDay.isRestDay ? "☑" : "☐"} Rest day
          </Text>
        </Pressable>

        {!currentDay.isRestDay && (
          <>
            {currentDay.exercises.map((e) => (
              <View key={e.tempId} style={styles.exerciseCard}>
                <View style={styles.exerciseCardHeader}>
                  <Text style={styles.exerciseName}>{e.exerciseName}</Text>
                  <Pressable onPress={() => removeExercise(e.tempId)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
                <Text style={styles.exerciseMeta}>
                  {e.sets} sets x {e.reps}
                  {e.targetLoad ? ` @ ${e.targetLoad}` : ""}
                  {e.targetRpe ? ` · RPE ${e.targetRpe}` : ""}
                </Text>
                {e.tempoNote ? (
                  <Text style={styles.exerciseTempo}>{e.tempoNote}</Text>
                ) : null}
              </View>
            ))}

            <Pressable
              style={styles.addExerciseButton}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.addExerciseButtonText}>+ Add Exercise</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Pressable
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Assign Program</Text>
        )}
      </Pressable>

      <ExercisePickerModal
        visible={pickerVisible}
        exercises={exercises}
        onClose={() => setPickerVisible(false)}
        onAdd={(draft) => {
          addExerciseToCurrentDay(draft);
          setPickerVisible(false);
        }}
      />
    </View>
  );
}

function ExercisePickerModal({
  visible,
  exercises,
  onClose,
  onAdd,
}: {
  visible: boolean;
  exercises: Exercise[];
  onClose: () => void;
  onAdd: (draft: DraftExercise) => void;
}) {
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [search, setSearch] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("5");
  const [targetLoad, setTargetLoad] = useState("");
  const [targetRpe, setTargetRpe] = useState("");
  const [tempoNote, setTempoNote] = useState("");

  const filtered = useMemo(
    () =>
      exercises.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
      ),
    [exercises, search]
  );

  function reset() {
    setSelected(null);
    setSearch("");
    setSets("3");
    setReps("5");
    setTargetLoad("");
    setTargetRpe("");
    setTempoNote("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleAdd() {
    if (!selected) return;
    onAdd({
      tempId: `${selected.id}-${Date.now()}`,
      exerciseId: selected.id,
      exerciseName: selected.name,
      sets,
      reps,
      targetLoad,
      targetRpe,
      tempoNote,
    });
    reset();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {!selected ? (
            <>
              <Text style={styles.modalTitle}>Pick an exercise</Text>
              <TextInput
                style={styles.input}
                placeholder="Search"
                placeholderTextColor={colors.faint}
                value={search}
                onChangeText={setSearch}
              />
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 300 }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No exercises match. Add some in the Library tab first.
                  </Text>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.pickRow}
                    onPress={() => setSelected(item)}
                  >
                    <Text style={styles.pickRowText}>{item.name}</Text>
                  </Pressable>
                )}
              />
              <Pressable style={styles.secondaryButton} onPress={handleClose}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.modalTitle}>{selected.name}</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.rowInput]}
                  placeholder="Sets"
                  placeholderTextColor={colors.faint}
                  keyboardType="numeric"
                  value={sets}
                  onChangeText={setSets}
                />
                <TextInput
                  style={[styles.input, styles.rowInput]}
                  placeholder="Reps (e.g. 5 or 8-10)"
                  placeholderTextColor={colors.faint}
                  value={reps}
                  onChangeText={setReps}
                />
              </View>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.rowInput]}
                  placeholder="Load (e.g. 80% or 60kg)"
                  placeholderTextColor={colors.faint}
                  value={targetLoad}
                  onChangeText={setTargetLoad}
                />
                <TextInput
                  style={[styles.input, styles.rowInput]}
                  placeholder="RPE"
                  placeholderTextColor={colors.faint}
                  keyboardType="numeric"
                  value={targetRpe}
                  onChangeText={setTargetRpe}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Tempo / technique note (optional)"
                placeholderTextColor={colors.faint}
                value={tempoNote}
                onChangeText={setTempoNote}
              />
              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => setSelected(null)}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={handleAdd}>
                  <Text style={styles.primaryButtonText}>Add to day</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  copyButton: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  copyButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  dayTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  dayTabActive: {
    backgroundColor: colors.accent,
  },
  dayTabText: {
    color: colors.muted,
    fontWeight: "600",
  },
  dayTabTextActive: {
    color: "#fff",
  },
  restToggle: {
    marginBottom: 16,
  },
  restToggleText: {
    color: colors.text,
    fontSize: 15,
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  exerciseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  exerciseName: {
    color: colors.text,
    fontWeight: "600",
    flex: 1,
  },
  removeText: {
    color: colors.accent,
    fontSize: 12,
  },
  exerciseMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  exerciseTempo: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 2,
  },
  addExerciseButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.card,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  addExerciseButtonText: {
    color: colors.muted,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 24,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
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
    maxHeight: "85%",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowInput: {
    flex: 1,
  },
  pickRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  pickRowText: {
    color: colors.text,
    fontSize: 15,
  },
  emptyText: {
    color: colors.muted,
    textAlign: "center",
    marginTop: 20,
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
    marginTop: 8,
  },
  secondaryButtonText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600",
  },
});
