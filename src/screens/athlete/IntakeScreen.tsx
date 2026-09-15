import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

const STEPS = ["Lifts & PRs", "Injuries & Recovery", "Equipment", "Squat Style"];

const EQUIPMENT_OPTIONS = [
  "Full commercial gym",
  "Home gym (barbell + rack)",
  "Minimal / bodyweight only",
];

const SQUAT_STYLE_OPTIONS = [
  "Low bar",
  "High bar",
  "Safety squat bar",
  "Not sure yet",
];

export default function IntakeScreen() {
  const { session, refreshAthleteProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [squat1rm, setSquat1rm] = useState("");
  const [bench1rm, setBench1rm] = useState("");
  const [deadlift1rm, setDeadlift1rm] = useState("");
  const [injuriesNotes, setInjuriesNotes] = useState("");
  const [recoveryNotes, setRecoveryNotes] = useState("");
  const [equipmentAccess, setEquipmentAccess] = useState<string | null>(null);
  const [squatStyle, setSquatStyle] = useState<string | null>(null);

  const isLastStep = step === STEPS.length - 1;
  const canGoNext = step === 2 ? !!equipmentAccess : true;

  function goNext() {
    if (!isLastStep) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function handleFinish() {
    if (!session || !squatStyle) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("athlete_profiles").insert({
        user_id: session.user.id,
        squat_1rm: squat1rm ? Number(squat1rm) : null,
        bench_1rm: bench1rm ? Number(bench1rm) : null,
        deadlift_1rm: deadlift1rm ? Number(deadlift1rm) : null,
        injuries_notes: injuriesNotes || null,
        recovery_notes: recoveryNotes || null,
        equipment_access: equipmentAccess,
        squat_style: squatStyle,
        onboarded_at: new Date().toISOString(),
      });
      if (error) throw error;
      await refreshAthleteProfile();
    } catch (err: any) {
      Alert.alert(
        "Couldn't save your intake",
        err.message ?? "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i <= step && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <View>
            <Text style={styles.heading}>Your current lifts</Text>
            <Text style={styles.helper}>
              Best known 1-rep max in kg. Leave blank if you're not sure yet.
            </Text>
            <NumberField
              label="Squat"
              value={squat1rm}
              onChangeText={setSquat1rm}
            />
            <NumberField
              label="Bench"
              value={bench1rm}
              onChangeText={setBench1rm}
            />
            <NumberField
              label="Deadlift"
              value={deadlift1rm}
              onChangeText={setDeadlift1rm}
            />
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.heading}>Injuries & recovery</Text>
            <Text style={styles.helper}>
              Anything your coach should know before programming your week.
            </Text>
            <Text style={styles.fieldLabel}>Current or past injuries</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. lower back tightness, previous shoulder surgery"
              placeholderTextColor="#6B6B70"
              multiline
              value={injuriesNotes}
              onChangeText={setInjuriesNotes}
            />
            <Text style={styles.fieldLabel}>Sleep & recovery notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. sleep ~6 hours, high-stress job"
              placeholderTextColor="#6B6B70"
              multiline
              value={recoveryNotes}
              onChangeText={setRecoveryNotes}
            />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.heading}>Equipment access</Text>
            <Text style={styles.helper}>
              What can you train with day to day?
            </Text>
            {EQUIPMENT_OPTIONS.map((option) => (
              <OptionRow
                key={option}
                label={option}
                selected={equipmentAccess === option}
                onPress={() => setEquipmentAccess(option)}
              />
            ))}
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.heading}>Squat style</Text>
            <Text style={styles.helper}>
              How do you squat? This shapes your program's accessory work.
            </Text>
            {SQUAT_STYLE_OPTIONS.map((option) => (
              <OptionRow
                key={option}
                label={option}
                selected={squatStyle === option}
                onPress={() => setSquatStyle(option)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <Pressable style={styles.secondaryButton} onPress={goBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        )}
        {isLastStep ? (
          <Pressable
            style={[styles.primaryButton, !squatStyle && styles.buttonDisabled]}
            onPress={handleFinish}
            disabled={!squatStyle || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Finish</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.primaryButton, !canGoNext && styles.buttonDisabled]}
            onPress={goNext}
            disabled={!canGoNext}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function NumberField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.fieldLabel}>{label} (kg)</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#6B6B70"
        keyboardType="numeric"
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9.]/g, ""))}
      />
    </View>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.optionRow, selected && styles.optionRowSelected]}
      onPress={onPress}
    >
      <Text
        style={[styles.optionText, selected && styles.optionTextSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0C",
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  progressTrack: {
    flexDirection: "row",
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1B1B1E",
  },
  progressSegmentActive: {
    backgroundColor: "#E33A3A",
  },
  stepLabel: {
    color: "#9A9A9F",
    fontSize: 13,
    marginTop: 12,
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  heading: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  helper: {
    color: "#9A9A9F",
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  fieldLabel: {
    color: "#9A9A9F",
    fontSize: 13,
    marginBottom: 6,
  },
  numberField: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#1B1B1E",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: "#1B1B1E",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  optionRow: {
    backgroundColor: "#1B1B1E",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionRowSelected: {
    borderColor: "#E33A3A",
  },
  optionText: {
    color: "#9A9A9F",
    fontSize: 15,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#fff",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#E33A3A",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#1B1B1E",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#9A9A9F",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
