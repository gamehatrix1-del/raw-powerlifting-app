import { useEffect, useMemo, useState } from "react";
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
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import DateField from "../../components/DateField";
import SegmentedControl from "../../components/SegmentedControl";
import { useAuth } from "../../context/AuthContext";
import { thisMonday } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
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
  const { colors, typography, spacing, radius } = useTheme();
  const alert = useAppAlert();
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

  const inputStyle = {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    marginBottom: spacing.sm + 2,
  };

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
        alert("No previous program", "This athlete has no prior week to copy.");
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
      alert("Couldn't copy last week", err.message ?? "Please try again.");
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

      alert("Program assigned", `${athleteName}'s week is live.`);
      navigation.goBack();
    } catch (err: any) {
      alert("Couldn't save program", err.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 24 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.heading, { color: colors.text, fontSize: 20, marginBottom: spacing.lg }]}>
          Build week for {athleteName}
        </Text>

        <TextInput
          style={inputStyle}
          value={programName}
          onChangeText={setProgramName}
          placeholder="Program name"
          placeholderTextColor={colors.faint}
        />
        <DateField label="Week start" value={weekStartDate} onChange={setWeekStartDate} />

        <AnimatedPressable
          style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", marginBottom: spacing.xl }}
          onPress={handleCopyLastWeek}
          disabled={copying}
        >
          {copying ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[typography.bodyStrong, { color: colors.text }]}>Copy last week</Text>
          )}
        </AnimatedPressable>

        <View style={{ marginBottom: spacing.lg }}>
          <SegmentedControl
            options={days.map((d) => ({ label: String(d.dayNumber), value: String(d.dayNumber) }))}
            value={String(days[activeDay]?.dayNumber ?? 1)}
            onChange={(v) => setActiveDay(days.findIndex((d) => String(d.dayNumber) === v))}
          />
        </View>

        <TextInput
          style={inputStyle}
          value={currentDay.label}
          onChangeText={(text) => updateDay(activeDay, { label: text })}
          placeholder="Day label"
          placeholderTextColor={colors.faint}
        />

        <AnimatedPressable
          style={{ marginBottom: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.sm }}
          onPress={() => updateDay(activeDay, { isRestDay: !currentDay.isRestDay })}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: currentDay.isRestDay ? colors.accent : colors.border,
              backgroundColor: currentDay.isRestDay ? colors.accent : "transparent",
            }}
          />
          <Text style={[typography.body, { color: colors.text }]}>Rest day</Text>
        </AnimatedPressable>

        {!currentDay.isRestDay && (
          <>
            {currentDay.exercises.map((e) => (
              <View key={e.tempId} style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md + 2, marginBottom: spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[typography.bodyStrong, { color: colors.text, flex: 1 }]}>{e.exerciseName}</Text>
                  <AnimatedPressable onPress={() => removeExercise(e.tempId)}>
                    <Text style={[typography.caption, { color: colors.accent }]}>Remove</Text>
                  </AnimatedPressable>
                </View>
                <Text style={[typography.caption, { color: colors.muted, marginTop: 4 }]}>
                  {e.sets} sets x {e.reps}
                  {e.targetLoad ? ` @ ${e.targetLoad}` : ""}
                  {e.targetRpe ? ` · RPE ${e.targetRpe}` : ""}
                </Text>
                {e.tempoNote ? (
                  <Text style={[typography.caption, { color: colors.faint, marginTop: 2, fontSize: 12 }]}>{e.tempoNote}</Text>
                ) : null}
              </View>
            ))}

            <AnimatedPressable
              style={{
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.card,
                paddingVertical: spacing.md,
                alignItems: "center",
                marginTop: spacing.xs,
              }}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={[typography.bodyStrong, { color: colors.muted }]}>+ Add Exercise</Text>
            </AnimatedPressable>
          </>
        )}
      </ScrollView>

      <AnimatedPressable
        style={{
          backgroundColor: colors.accent,
          borderRadius: radius.md,
          paddingVertical: spacing.lg,
          alignItems: "center",
          marginHorizontal: spacing.xxl,
          marginBottom: spacing.xxl,
          opacity: saving ? 0.6 : 1,
        }}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={[typography.bodyStrong, { color: colors.accentText, fontSize: 16 }]}>Assign Program</Text>
        )}
      </AnimatedPressable>

      <ExercisePickerModal
        visible={pickerVisible}
        exercises={exercises}
        onClose={() => setPickerVisible(false)}
        onAdd={(draft) => {
          addExerciseToCurrentDay(draft);
          setPickerVisible(false);
        }}
      />
    </KeyboardAvoidingView>
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
  const { colors, typography, spacing, radius } = useTheme();
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

  const inputStyle = {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    marginBottom: spacing.sm + 2,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl, maxHeight: "85%" }}>
          {!selected ? (
            <>
              <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.lg }]}>Pick an exercise</Text>
              <TextInput
                style={inputStyle}
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
                  <Text style={[typography.caption, { color: colors.muted, textAlign: "center", marginTop: 20 }]}>
                    No exercises match. Add some in the Library tab first.
                  </Text>
                }
                renderItem={({ item }) => (
                  <AnimatedPressable
                    style={{ paddingVertical: spacing.md + 2, borderBottomWidth: 1, borderBottomColor: colors.background }}
                    onPress={() => setSelected(item)}
                  >
                    <Text style={[typography.body, { color: colors.text }]}>{item.name}</Text>
                  </AnimatedPressable>
                )}
              />
              <AnimatedPressable
                style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.sm + 2 }}
                onPress={handleClose}
              >
                <Text style={[typography.bodyStrong, { color: colors.muted }]}>Cancel</Text>
              </AnimatedPressable>
            </>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.lg }]}>{selected.name}</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm + 2 }}>
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="Sets"
                  placeholderTextColor={colors.faint}
                  keyboardType="numeric"
                  value={sets}
                  onChangeText={setSets}
                />
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="Reps (e.g. 5 or 8-10)"
                  placeholderTextColor={colors.faint}
                  value={reps}
                  onChangeText={setReps}
                />
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm + 2 }}>
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="Load (e.g. 80% or 60kg)"
                  placeholderTextColor={colors.faint}
                  value={targetLoad}
                  onChangeText={setTargetLoad}
                />
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="RPE"
                  placeholderTextColor={colors.faint}
                  keyboardType="numeric"
                  value={targetRpe}
                  onChangeText={setTargetRpe}
                />
              </View>
              <TextInput
                style={inputStyle}
                placeholder="Tempo / technique note (optional)"
                placeholderTextColor={colors.faint}
                value={tempoNote}
                onChangeText={setTempoNote}
              />
              <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xs }}>
                <AnimatedPressable
                  style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center" }}
                  onPress={() => setSelected(null)}
                >
                  <Text style={[typography.bodyStrong, { color: colors.muted }]}>Back</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={{ flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center" }}
                  onPress={handleAdd}
                >
                  <Text style={[typography.bodyStrong, { color: colors.accentText }]}>Add to day</Text>
                </AnimatedPressable>
              </View>
            </ScrollView>
          )}
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
