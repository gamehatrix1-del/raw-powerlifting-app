import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import DateField from "../../components/DateField";
import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { thisMonday } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { Profile } from "../../types/profile";

interface TemplateSummary {
  id: string;
  name: string;
}

export default function BulkAssignTemplateScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const alert = useAppAlert();
  const { session } = useAuth();

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSummary | null>(null);
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<Set<string>>(new Set());
  const [weekStartDate, setWeekStartDate] = useState(thisMonday());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [{ data: templateData, error: templateError }, { data: athleteData, error: athleteError }] = await Promise.all([
      supabase.from("program_templates").select("id, name").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "athlete").order("full_name", { ascending: true }),
    ]);

    if (templateError || athleteError) {
      console.error("Failed to load bulk-assign data", templateError ?? athleteError);
      setError(true);
      setLoading(false);
      return;
    }

    setTemplates((templateData as TemplateSummary[]) ?? []);
    setAthletes((athleteData as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  function toggleAthlete(id: string) {
    setSelectedAthleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    if (!selectedTemplate || !session || selectedAthleteIds.size === 0) return;
    setAssigning(true);
    try {
      const { data: templateDays, error: daysError } = await supabase
        .from("program_template_days")
        .select("*")
        .eq("template_id", selectedTemplate.id)
        .order("day_number", { ascending: true });
      if (daysError) throw daysError;

      const { data: templateExercises, error: exercisesError } = await supabase
        .from("program_template_exercises")
        .select("*")
        .in("template_day_id", (templateDays ?? []).map((d) => d.id))
        .order("order_index", { ascending: true });
      if (exercisesError) throw exercisesError;

      const athleteIds = [...selectedAthleteIds];
      let succeeded = 0;
      let failed = 0;

      for (const athleteId of athleteIds) {
        try {
          const { data: program, error: programError } = await supabase
            .from("programs")
            .insert({
              athlete_id: athleteId,
              coach_id: session.user.id,
              name: selectedTemplate.name,
              week_start_date: weekStartDate,
              status: "active",
            })
            .select()
            .single();
          if (programError) throw programError;

          const { data: insertedDays, error: insertDaysError } = await supabase
            .from("program_days")
            .insert(
              (templateDays ?? []).map((d) => ({
                program_id: program.id,
                day_number: d.day_number,
                day_label: d.day_label,
                is_rest_day: d.is_rest_day,
              }))
            )
            .select();
          if (insertDaysError) throw insertDaysError;

          const exerciseRows = (templateDays ?? []).flatMap((d) => {
            const dayRow = (insertedDays ?? []).find((row: any) => row.day_number === d.day_number);
            if (!dayRow) return [];
            return (templateExercises ?? [])
              .filter((e: any) => e.template_day_id === d.id)
              .map((e: any) => ({
                program_day_id: dayRow.id,
                exercise_id: e.exercise_id,
                order_index: e.order_index,
                sets: e.sets,
                reps: e.reps,
                target_load: e.target_load,
                target_rpe: e.target_rpe,
                tempo_note: e.tempo_note,
              }));
          });

          if (exerciseRows.length > 0) {
            const { error: insertExercisesError } = await supabase.from("program_exercises").insert(exerciseRows);
            if (insertExercisesError) throw insertExercisesError;
          }

          supabase.functions
            .invoke("notify-athlete", {
              body: {
                athleteId,
                title: "New program assigned",
                body: `${selectedTemplate.name} is ready — check out this week's plan.`,
                data: { type: "program_assigned" },
              },
            })
            .catch((err) => console.error("Failed to send program-assigned push", err));

          succeeded++;
        } catch (err) {
          console.error(`Failed to assign template to athlete ${athleteId}`, err);
          failed++;
        }
      }

      alert(
        "Bulk assign complete",
        failed > 0
          ? `Assigned to ${succeeded} athlete${succeeded === 1 ? "" : "s"}. ${failed} failed — please retry those individually.`
          : `Assigned "${selectedTemplate.name}" to ${succeeded} athlete${succeeded === 1 ? "" : "s"}.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      alert("Couldn't assign template", err.message ?? "Please try again.");
    } finally {
      setAssigning(false);
    }
  }

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
        <ErrorState message="Couldn't load templates or athletes." onRetry={load} />
      </View>
    );
  }

  if (!selectedTemplate) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 20, paddingHorizontal: spacing.xl }}>
        <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.lg }]}>
          Pick a saved template to apply to multiple athletes at once.
        </Text>
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.muted, textAlign: "center", marginTop: 40 }]}>
              No saved templates yet. Build a week in Program Builder and tap "Save as Template" first.
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
              onPress={() => setSelectedTemplate(item)}
            >
              <Text style={[typography.bodyStrong, { color: colors.text, flex: 1 }]}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </AnimatedPressable>
          )}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 20, paddingHorizontal: spacing.xl }}>
      <AnimatedPressable onPress={() => setSelectedTemplate(null)} style={{ marginBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name="chevron-back" size={16} color={colors.accent} />
        <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>{selectedTemplate.name}</Text>
      </AnimatedPressable>

      <DateField label="Week start" value={weekStartDate} onChange={setWeekStartDate} />

      <Text style={[typography.subheading, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm + 2 }]}>
        Select athletes ({selectedAthleteIds.size} selected)
      </Text>

      <FlatList
        data={athletes}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.muted, textAlign: "center", marginTop: 40 }]}>
            No athletes have signed up yet.
          </Text>
        }
        renderItem={({ item }) => {
          const selected = selectedAthleteIds.has(item.id);
          return (
            <AnimatedPressable
              onPress={() => toggleAthlete(item.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.card,
                borderRadius: radius.md,
                padding: spacing.md + 2,
                marginBottom: spacing.sm,
                gap: spacing.sm + 2,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accent : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selected && <Ionicons name="checkmark" size={14} color={colors.accentText} />}
              </View>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{item.full_name}</Text>
            </AnimatedPressable>
          );
        }}
      />

      <AnimatedPressable
        style={{
          position: "absolute",
          bottom: insets.bottom + spacing.md,
          left: spacing.xl,
          right: spacing.xl,
          backgroundColor: colors.accent,
          borderRadius: radius.md,
          paddingVertical: spacing.lg,
          alignItems: "center",
          opacity: selectedAthleteIds.size === 0 ? 0.5 : 1,
        }}
        onPress={handleAssign}
        disabled={selectedAthleteIds.size === 0 || assigning}
      >
        {assigning ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={[typography.bodyStrong, { color: colors.accentText, fontSize: 16 }]}>
            Assign to {selectedAthleteIds.size} athlete{selectedAthleteIds.size === 1 ? "" : "s"}
          </Text>
        )}
      </AnimatedPressable>
    </View>
  );
}
