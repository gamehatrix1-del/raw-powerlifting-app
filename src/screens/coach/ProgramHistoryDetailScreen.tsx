import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import AnimatedPressable from "../../components/AnimatedPressable";
import ErrorState from "../../components/ErrorState";
import SegmentedControl from "../../components/SegmentedControl";
import { formatDisplayDate } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { ProgramDay } from "../../types/program";

interface DayExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  target_load: string | null;
  target_rpe: number | null;
  tempo_note: string | null;
}

interface LoggedSet {
  id: string;
  program_exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  logged_at: string;
  coach_note: string | null;
  coach_note_at: string | null;
}

export default function ProgramHistoryDetailScreen({ route }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const { programId, programName, weekStartDate, status, athleteId, athleteName } = route.params as {
    programId: string;
    programName: string;
    weekStartDate: string;
    status: string;
    athleteId?: string;
    athleteName?: string;
  };

  const [days, setDays] = useState<ProgramDay[]>([]);
  const [exercisesByDay, setExercisesByDay] = useState<Record<string, DayExercise[]>>({});
  const [logsByExercise, setLogsByExercise] = useState<Record<string, LoggedSet[]>>({});
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{ set: LoggedSet; exerciseName: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);

    const { data: programDays, error: daysError } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_id", programId)
      .order("day_number", { ascending: true });

    if (daysError) {
      console.error("Failed to load program days", daysError);
      setError(true);
      setLoading(false);
      return;
    }

    setDays((programDays as ProgramDay[]) ?? []);

    const dayIds = (programDays ?? []).map((d) => d.id);
    if (dayIds.length > 0) {
      const { data: programExercises, error: exercisesError } = await supabase
        .from("program_exercises")
        .select("*, exercises(name)")
        .in("program_day_id", dayIds)
        .order("order_index", { ascending: true });

      if (exercisesError) {
        console.error("Failed to load program exercises", exercisesError);
      } else {
        const grouped: Record<string, DayExercise[]> = {};
        for (const row of programExercises ?? []) {
          const list = grouped[row.program_day_id] ?? [];
          list.push({
            id: row.id,
            name: row.exercises?.name ?? "Exercise",
            sets: row.sets,
            reps: row.reps,
            target_load: row.target_load,
            target_rpe: row.target_rpe,
            tempo_note: row.tempo_note,
          });
          grouped[row.program_day_id] = list;
        }
        setExercisesByDay(grouped);

        const programExerciseIds = (programExercises ?? []).map((row) => row.id);
        if (athleteId && programExerciseIds.length > 0) {
          const { data: logs, error: logsError } = await supabase
            .from("workout_logs")
            .select("id, program_exercise_id, set_number, weight, reps, rpe, logged_at, coach_note, coach_note_at")
            .eq("athlete_id", athleteId)
            .in("program_exercise_id", programExerciseIds)
            .order("set_number", { ascending: true });

          if (logsError) {
            console.error("Failed to load logged sets", logsError);
          } else {
            const byExercise: Record<string, LoggedSet[]> = {};
            for (const log of (logs as LoggedSet[]) ?? []) {
              const list = byExercise[log.program_exercise_id] ?? [];
              list.push(log);
              byExercise[log.program_exercise_id] = list;
            }
            setLogsByExercise(byExercise);
          }
        }
      }
    }

    setLoading(false);
  }, [programId, athleteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveNote(text: string) {
    if (!noteTarget) return;
    const trimmed = text.trim();
    const { error: saveError } = await supabase
      .from("workout_logs")
      .update({
        coach_note: trimmed || null,
        coach_note_at: trimmed ? new Date().toISOString() : null,
      })
      .eq("id", noteTarget.set.id);

    if (saveError) {
      console.error("Failed to save coach note", saveError);
      return;
    }

    setLogsByExercise((prev) => {
      const list = prev[noteTarget.set.program_exercise_id] ?? [];
      return {
        ...prev,
        [noteTarget.set.program_exercise_id]: list.map((s) =>
          s.id === noteTarget.set.id
            ? { ...s, coach_note: trimmed || null, coach_note_at: trimmed ? new Date().toISOString() : null }
            : s
        ),
      };
    });
    setNoteTarget(null);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || days.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ErrorState message="Couldn't load this program." onRetry={load} />
      </View>
    );
  }

  const activeProgramDay = days[activeDay];
  const activeExercises = exercisesByDay[activeProgramDay.id] ?? [];
  const isActive = status === "active";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 20, paddingHorizontal: spacing.xl }}>
      <Text style={[typography.title, { color: colors.text }]}>{programName}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4, marginBottom: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.muted }]}>
          Week of {formatDisplayDate(weekStartDate)}
          {athleteName ? ` · ${athleteName}` : ""}
        </Text>
        <View
          style={{
            backgroundColor: isActive ? colors.successMuted : colors.cardAlt,
            borderRadius: radius.pill,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={[typography.micro, { color: isActive ? colors.success : colors.faint, letterSpacing: 0 }]}>
            {status.toUpperCase()}
          </Text>
        </View>
      </View>

      <SegmentedControl
        options={days.map((d) => ({ label: String(d.day_number), value: d.id }))}
        value={activeProgramDay.id}
        onChange={(id) => setActiveDay(days.findIndex((d) => d.id === id))}
      />

      <Text style={[typography.subheading, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md }]}>
        {activeProgramDay.day_label}
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {activeProgramDay.is_rest_day ? (
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xxl, alignItems: "center" }}>
            <Ionicons name="bed-outline" size={28} color={colors.faint} style={{ marginBottom: spacing.sm }} />
            <Text style={[typography.body, { color: colors.muted }]}>Rest day</Text>
          </View>
        ) : activeExercises.length === 0 ? (
          <Text style={[typography.body, { color: colors.muted, textAlign: "center" }]}>
            Nothing programmed for this day.
          </Text>
        ) : (
          activeExercises.map((e, index) => {
            const loggedSets = logsByExercise[e.id] ?? [];
            return (
              <View
                key={e.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  marginBottom: spacing.sm + 2,
                }}
              >
                <View style={{ flexDirection: "row" }}>
                  <View
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: colors.accentMuted,
                      alignItems: "center", justifyContent: "center",
                      marginRight: spacing.md,
                    }}
                  >
                    <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.subheading, { color: colors.text }]}>{e.name}</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm }}>
                      <View style={{ backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={[typography.micro, { color: colors.text, letterSpacing: 0 }]}>
                          {e.sets} × {e.reps}
                        </Text>
                      </View>
                      {e.target_load && (
                        <View style={{ backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={[typography.micro, { color: colors.text, letterSpacing: 0 }]}>{e.target_load}</Text>
                        </View>
                      )}
                      {e.target_rpe && (
                        <View style={{ backgroundColor: colors.accentMuted, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={[typography.micro, { color: colors.accent, letterSpacing: 0 }]}>RPE {e.target_rpe}</Text>
                        </View>
                      )}
                    </View>
                    {e.tempo_note ? (
                      <Text style={[typography.caption, { color: colors.faint, marginTop: spacing.sm }]}>{e.tempo_note}</Text>
                    ) : null}
                  </View>
                </View>

                {athleteId && (
                  <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.background }}>
                    {loggedSets.length === 0 ? (
                      <Text style={[typography.caption, { color: colors.faint }]}>Not logged yet.</Text>
                    ) : (
                      loggedSets.map((s) => (
                        <AnimatedPressable
                          key={s.id}
                          onPress={() => setNoteTarget({ set: s, exerciseName: e.name })}
                          style={{ marginBottom: spacing.sm }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Text style={[typography.caption, { color: colors.text }]}>
                              Set {s.set_number}: {s.weight ?? "—"}kg × {s.reps ?? "—"}
                              {s.rpe ? ` @ RPE ${s.rpe}` : ""}
                            </Text>
                            <Ionicons
                              name={s.coach_note ? "chatbubble" : "chatbubble-outline"}
                              size={16}
                              color={s.coach_note ? colors.accent : colors.faint}
                            />
                          </View>
                          {s.coach_note ? (
                            <Text style={[typography.micro, { color: colors.accent, letterSpacing: 0, marginTop: 2 }]} numberOfLines={2}>
                              "{s.coach_note}"
                            </Text>
                          ) : null}
                        </AnimatedPressable>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <NoteModal
        visible={!!noteTarget}
        exerciseName={noteTarget?.exerciseName ?? ""}
        setNumber={noteTarget?.set.set_number ?? 0}
        initialText={noteTarget?.set.coach_note ?? ""}
        onClose={() => setNoteTarget(null)}
        onSave={saveNote}
      />
    </View>
  );
}

function NoteModal({
  visible,
  exerciseName,
  setNumber,
  initialText,
  onClose,
  onSave,
}: {
  visible: boolean;
  exerciseName: string;
  setNumber: number;
  initialText: string;
  onClose: () => void;
  onSave: (text: string) => Promise<void>;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setText(initialText);
  }, [visible, initialText]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl }}>
            <Text style={[typography.heading, { color: colors.text, marginBottom: 4 }]}>Feedback on this set</Text>
            <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.lg }]}>
              {exerciseName} · Set {setNumber}
            </Text>

            <TextInput
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                borderRadius: radius.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                fontSize: 15,
                minHeight: 100,
                textAlignVertical: "top",
                marginBottom: spacing.lg,
              }}
              placeholder="e.g. Bar speed dropped on the last rep — let's cut 5kg next week."
              placeholderTextColor={colors.faint}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
            />

            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <AnimatedPressable
                style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center" }}
                onPress={onClose}
              >
                <Text style={[typography.bodyStrong, { color: colors.muted }]}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={{ flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center" }}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Text style={[typography.bodyStrong, { color: colors.accentText }]}>Save</Text>
                )}
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
