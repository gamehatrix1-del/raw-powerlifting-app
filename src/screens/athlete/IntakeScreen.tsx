import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";
import {
  ChipGroup,
  MultiChipGroup,
  NumberField,
  ScaleField,
  SectionHeading,
  TextField,
} from "./intake/fields";

const STEP_TITLES = [
  "Athlete Profile",
  "Best Lift Numbers",
  "Training Information",
  "Daily Routine & Recovery",
  "Technique Profile",
  "Medical History",
  "Injury History",
  "Nutrition & Supplementation",
  "Equipment & Gym Access",
  "Additional Notes",
];

const RECOVERY_TOOLS = [
  "CPAP",
  "EMS/TENS",
  "Sauna",
  "Ice Bath",
  "Massage Gun",
  "Physio",
];

const EQUIPMENT_OPTIONS = [
  "Comp Rack",
  "Power Rack",
  "Squat Bar",
  "Deadlift Bar",
  "SSB Bar",
  "Belt Squat",
  "Reverse Hyper",
  "GHD",
  "Cable Machine",
];

interface FormState {
  age: string;
  gender: string | null;
  city: string;
  heightCm: string;
  bodyweightKg: string;
  bodyFatPct: string;
  weightClass: string;
  occupation: string;
  trainingExperience: string;
  powerliftingExperience: string;
  federation: string;
  meetDate: string;
  meetsDone: string;
  currentGoal: string;
  trainingDaysPerWeek: string | null;

  squatBest1rm: string;
  squatBest3rm: string;
  squatCompPr: string;
  benchBest1rm: string;
  benchBest3rm: string;
  benchCompPr: string;
  deadliftBest1rm: string;
  deadliftBest3rm: string;
  deadliftCompPr: string;

  trainingTime: string | null;
  sessionDuration: string | null;
  wakeTime: string;
  sleepTime: string;
  sleepHours: string;

  recoveryTools: string[];
  stressLevel: number;
  sleepQuality: number;
  recoveryLevel: number;

  squatBarType: string | null;
  squatStance: string | null;
  benchGrip: string | null;
  benchArch: string | null;
  deadliftStyle: string | null;
  deadliftGrip: string | null;

  medicalConditions: string;
  pastSurgeries: string;

  injuriesNotes: string;

  dietType: string | null;
  proteinIntakeG: string;
  waterIntakeL: string;
  foodAllergies: string;
  currentSupplements: string;

  equipmentAccess: string[];

  coachingNotes: string;
}

const INITIAL_FORM: FormState = {
  age: "",
  gender: null,
  city: "",
  heightCm: "",
  bodyweightKg: "",
  bodyFatPct: "",
  weightClass: "",
  occupation: "",
  trainingExperience: "",
  powerliftingExperience: "",
  federation: "",
  meetDate: "",
  meetsDone: "",
  currentGoal: "",
  trainingDaysPerWeek: null,

  squatBest1rm: "",
  squatBest3rm: "",
  squatCompPr: "",
  benchBest1rm: "",
  benchBest3rm: "",
  benchCompPr: "",
  deadliftBest1rm: "",
  deadliftBest3rm: "",
  deadliftCompPr: "",

  trainingTime: null,
  sessionDuration: null,
  wakeTime: "",
  sleepTime: "",
  sleepHours: "",

  recoveryTools: [],
  stressLevel: 5,
  sleepQuality: 5,
  recoveryLevel: 5,

  squatBarType: null,
  squatStance: null,
  benchGrip: null,
  benchArch: null,
  deadliftStyle: null,
  deadliftGrip: null,

  medicalConditions: "",
  pastSurgeries: "",

  injuriesNotes: "",

  dietType: null,
  proteinIntakeG: "",
  waterIntakeL: "",
  foodAllergies: "",
  currentSupplements: "",

  equipmentAccess: [],

  coachingNotes: "",
};

function toNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function IntakeScreen() {
  const { session, refreshAthleteProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEP_TITLES.length,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const isLastStep = step === STEP_TITLES.length - 1;

  function goNext() {
    if (!isLastStep) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function handleFinish() {
    if (!session) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("athlete_profiles").insert({
        user_id: session.user.id,
        age: toNumber(form.age),
        gender: form.gender,
        city: form.city || null,
        height_cm: toNumber(form.heightCm),
        bodyweight_kg: toNumber(form.bodyweightKg),
        body_fat_pct: toNumber(form.bodyFatPct),
        weight_class: form.weightClass || null,
        occupation: form.occupation || null,
        training_experience: form.trainingExperience || null,
        powerlifting_experience: form.powerliftingExperience || null,
        federation: form.federation || null,
        meet_date: form.meetDate || null,
        meets_done: toNumber(form.meetsDone),
        current_goal: form.currentGoal || null,
        training_days_per_week: toNumber(form.trainingDaysPerWeek ?? ""),

        squat_1rm: toNumber(form.squatBest1rm),
        squat_best_3rm: toNumber(form.squatBest3rm),
        squat_competition_pr: toNumber(form.squatCompPr),
        bench_1rm: toNumber(form.benchBest1rm),
        bench_best_3rm: toNumber(form.benchBest3rm),
        bench_competition_pr: toNumber(form.benchCompPr),
        deadlift_1rm: toNumber(form.deadliftBest1rm),
        deadlift_best_3rm: toNumber(form.deadliftBest3rm),
        deadlift_competition_pr: toNumber(form.deadliftCompPr),

        training_time: form.trainingTime,
        session_duration: form.sessionDuration,
        wake_time: form.wakeTime || null,
        sleep_time: form.sleepTime || null,
        sleep_hours: toNumber(form.sleepHours),

        recovery_tools: form.recoveryTools.length ? form.recoveryTools : null,
        stress_level: form.stressLevel,
        sleep_quality: form.sleepQuality,
        recovery_level: form.recoveryLevel,

        squat_style: form.squatBarType,
        squat_stance: form.squatStance,
        bench_grip: form.benchGrip,
        bench_arch: form.benchArch,
        deadlift_style: form.deadliftStyle,
        deadlift_grip: form.deadliftGrip,

        medical_conditions: form.medicalConditions || null,
        past_surgeries: form.pastSurgeries || null,

        injuries_notes: form.injuriesNotes || null,

        diet_type: form.dietType,
        protein_intake_g: toNumber(form.proteinIntakeG),
        water_intake_l: toNumber(form.waterIntakeL),
        food_allergies: form.foodAllergies || null,
        current_supplements: form.currentSupplements || null,

        equipment_access: form.equipmentAccess.length
          ? form.equipmentAccess
          : null,

        coaching_notes: form.coachingNotes || null,

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
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.stepLabel}>
        Step {step + 1} of {STEP_TITLES.length}
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <View>
            <SectionHeading
              title="Athlete Profile"
              subtitle="The basics that shape everything else."
            />
            <NumberField label="Age" value={form.age} onChangeText={(v) => set("age", v)} />
            <ChipGroup
              label="Gender"
              options={["Male", "Female", "Other"]}
              value={form.gender}
              onChange={(v) => set("gender", v)}
            />
            <TextField label="City" value={form.city} onChangeText={(v) => set("city", v)} />
            <NumberField label="Height" suffix="cm" value={form.heightCm} onChangeText={(v) => set("heightCm", v)} />
            <NumberField label="Bodyweight" suffix="kg" value={form.bodyweightKg} onChangeText={(v) => set("bodyweightKg", v)} />
            <NumberField label="Body Fat" suffix="%" value={form.bodyFatPct} onChangeText={(v) => set("bodyFatPct", v)} />
            <TextField label="Weight Class" value={form.weightClass} onChangeText={(v) => set("weightClass", v)} placeholder="e.g. 83kg" />
            <TextField label="Occupation" value={form.occupation} onChangeText={(v) => set("occupation", v)} />
            <TextField label="Training Experience" value={form.trainingExperience} onChangeText={(v) => set("trainingExperience", v)} placeholder="e.g. 3 years" />
            <TextField label="Powerlifting Experience" value={form.powerliftingExperience} onChangeText={(v) => set("powerliftingExperience", v)} placeholder="e.g. 1 year" />
            <TextField label="Federation" value={form.federation} onChangeText={(v) => set("federation", v)} placeholder="e.g. IPF, USPA" />
            <TextField label="Next Meet Date" value={form.meetDate} onChangeText={(v) => set("meetDate", v)} placeholder="YYYY-MM-DD" />
            <NumberField label="Meets Done" value={form.meetsDone} onChangeText={(v) => set("meetsDone", v)} />
            <TextField label="Current Goal" value={form.currentGoal} onChangeText={(v) => set("currentGoal", v)} multiline placeholder="What are you training toward right now?" />
            <ChipGroup
              label="Training Days / Week"
              options={["3", "4", "5", "6", "7"]}
              value={form.trainingDaysPerWeek}
              onChange={(v) => set("trainingDaysPerWeek", v)}
            />
          </View>
        )}

        {step === 1 && (
          <View>
            <SectionHeading
              title="Best Lift Numbers"
              subtitle="Best known numbers in kg. Leave blank if unsure."
            />
            <Text style={styles.liftGroupLabel}>Squat</Text>
            <NumberField label="Best 1RM" value={form.squatBest1rm} onChangeText={(v) => set("squatBest1rm", v)} />
            <NumberField label="Best 3RM" value={form.squatBest3rm} onChangeText={(v) => set("squatBest3rm", v)} />
            <NumberField label="Competition PR" value={form.squatCompPr} onChangeText={(v) => set("squatCompPr", v)} />

            <Text style={styles.liftGroupLabel}>Bench</Text>
            <NumberField label="Best 1RM" value={form.benchBest1rm} onChangeText={(v) => set("benchBest1rm", v)} />
            <NumberField label="Best 3RM" value={form.benchBest3rm} onChangeText={(v) => set("benchBest3rm", v)} />
            <NumberField label="Competition PR" value={form.benchCompPr} onChangeText={(v) => set("benchCompPr", v)} />

            <Text style={styles.liftGroupLabel}>Deadlift</Text>
            <NumberField label="Best 1RM" value={form.deadliftBest1rm} onChangeText={(v) => set("deadliftBest1rm", v)} />
            <NumberField label="Best 3RM" value={form.deadliftBest3rm} onChangeText={(v) => set("deadliftBest3rm", v)} />
            <NumberField label="Competition PR" value={form.deadliftCompPr} onChangeText={(v) => set("deadliftCompPr", v)} />
          </View>
        )}

        {step === 2 && (
          <View>
            <SectionHeading title="Training Information" />
            <ChipGroup label="Training Time" options={["Morning", "Afternoon", "Evening", "Night"]} value={form.trainingTime} onChange={(v) => set("trainingTime", v)} />
            <ChipGroup label="Session Duration" options={["<60m", "60-90m", "90-120m", "120m+"]} value={form.sessionDuration} onChange={(v) => set("sessionDuration", v)} />
            <TextField label="Wake Time" value={form.wakeTime} onChangeText={(v) => set("wakeTime", v)} placeholder="e.g. 6:30 AM" />
            <TextField label="Sleep Time" value={form.sleepTime} onChangeText={(v) => set("sleepTime", v)} placeholder="e.g. 11:00 PM" />
            <NumberField label="Sleep Hours" value={form.sleepHours} onChangeText={(v) => set("sleepHours", v)} />
          </View>
        )}

        {step === 3 && (
          <View>
            <SectionHeading title="Daily Routine & Recovery" />
            <MultiChipGroup label="Recovery Tools" options={RECOVERY_TOOLS} values={form.recoveryTools} onChange={(v) => set("recoveryTools", v)} />
            <ScaleField label="Stress" value={form.stressLevel} onChange={(v) => set("stressLevel", v)} />
            <ScaleField label="Sleep Quality" value={form.sleepQuality} onChange={(v) => set("sleepQuality", v)} />
            <ScaleField label="Recovery" value={form.recoveryLevel} onChange={(v) => set("recoveryLevel", v)} />
          </View>
        )}

        {step === 4 && (
          <View>
            <SectionHeading title="Technique Profile" />
            <ChipGroup label="Squat Bar" options={["High Bar", "Low Bar", "SSB"]} value={form.squatBarType} onChange={(v) => set("squatBarType", v)} />
            <ChipGroup label="Squat Stance" options={["Narrow", "Moderate", "Wide"]} value={form.squatStance} onChange={(v) => set("squatStance", v)} />
            <ChipGroup label="Bench Grip" options={["Close", "Medium", "Wide"]} value={form.benchGrip} onChange={(v) => set("benchGrip", v)} />
            <ChipGroup label="Bench Arch" options={["Low", "Moderate", "High"]} value={form.benchArch} onChange={(v) => set("benchArch", v)} />
            <ChipGroup label="Deadlift Style" options={["Conventional", "Sumo"]} value={form.deadliftStyle} onChange={(v) => set("deadliftStyle", v)} />
            <ChipGroup label="Deadlift Grip" options={["Hook", "Mixed", "Straps"]} value={form.deadliftGrip} onChange={(v) => set("deadliftGrip", v)} />
          </View>
        )}

        {step === 5 && (
          <View>
            <SectionHeading title="Medical History" />
            <TextField label="Medical Conditions / Medications" value={form.medicalConditions} onChangeText={(v) => set("medicalConditions", v)} multiline />
            <TextField label="Past Surgeries" value={form.pastSurgeries} onChangeText={(v) => set("pastSurgeries", v)} multiline />
          </View>
        )}

        {step === 6 && (
          <View>
            <SectionHeading title="Injury History" subtitle="Current injuries, pain areas, previous significant injuries." />
            <TextField label="Details" value={form.injuriesNotes} onChangeText={(v) => set("injuriesNotes", v)} multiline />
          </View>
        )}

        {step === 7 && (
          <View>
            <SectionHeading title="Nutrition & Supplementation" />
            <ChipGroup label="Diet Type" options={["Vegetarian", "Egg Vegetarian", "Non-Vegetarian"]} value={form.dietType} onChange={(v) => set("dietType", v)} />
            <NumberField label="Protein Intake" suffix="g/day" value={form.proteinIntakeG} onChangeText={(v) => set("proteinIntakeG", v)} />
            <NumberField label="Water Intake" suffix="L/day" value={form.waterIntakeL} onChangeText={(v) => set("waterIntakeL", v)} />
            <TextField label="Foods Avoided / Allergies" value={form.foodAllergies} onChangeText={(v) => set("foodAllergies", v)} multiline />
            <TextField label="Current Supplements" value={form.currentSupplements} onChangeText={(v) => set("currentSupplements", v)} multiline />
          </View>
        )}

        {step === 8 && (
          <View>
            <SectionHeading title="Equipment & Gym Access" />
            <MultiChipGroup label="Available Equipment" options={EQUIPMENT_OPTIONS} values={form.equipmentAccess} onChange={(v) => set("equipmentAccess", v)} />
          </View>
        )}

        {step === 9 && (
          <View>
            <SectionHeading title="Additional Notes" subtitle="Anything else your coach should know." />
            <TextField label="Coaching Information" value={form.coachingNotes} onChangeText={(v) => set("coachingNotes", v)} multiline />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <AnimatedPressable style={styles.secondaryButton} onPress={goBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </AnimatedPressable>
        )}
        {isLastStep ? (
          <AnimatedPressable
            style={styles.primaryButton}
            onPress={handleFinish}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Finish</Text>
            )}
          </AnimatedPressable>
        ) : (
          <AnimatedPressable style={styles.primaryButton} onPress={goNext}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </AnimatedPressable>
        )}
      </View>
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
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  stepLabel: {
    color: colors.muted,
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
  liftGroupLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 20,
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
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600",
  },
});
