import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import { useAppAlert } from "../components/AppAlert";
import AppTextInput from "../components/AppTextInput";
import DateField from "../components/DateField";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  ChipGroup,
  DateOfBirthField,
  HeightField,
  MultiChipGroup,
  NumberField,
  ScaleField,
  TextField,
} from "./athlete/intake/fields";
import { useTheme } from "../theme/ThemeContext";

const RECOVERY_TOOLS = ["CPAP", "EMS/TENS", "Sauna", "Ice Bath", "Massage Gun", "Physio"];
const EQUIPMENT_OPTIONS = [
  "Comp Rack", "Power Rack", "Squat Bar", "Deadlift Bar", "SSB Bar",
  "Belt Squat", "Reverse Hyper", "GHD", "Cable Machine",
];

function toNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function numStr(n: number | null | undefined): string {
  return n === null || n === undefined ? "" : String(n);
}

function ageFromDob(iso: string): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dob = new Date(y, m - 1, d);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthday =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

function Section({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.md, overflow: "hidden" }}>
      <AnimatedPressable
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
        }}
      >
        <View
          style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: colors.accentMuted,
            alignItems: "center", justifyContent: "center",
            marginRight: spacing.md,
          }}
        >
          <Ionicons name={icon} size={16} color={colors.accent} />
        </View>
        <Text style={[typography.bodyStrong, { color: colors.text, flex: 1, fontSize: 16 }]}>{title}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />
      </AnimatedPressable>
      {expanded && (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>{children}</View>
      )}
    </View>
  );
}

export default function EditProfileScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const alert = useAppAlert();
  const { session, profile, athleteProfile, refreshAthleteProfile } = useAuth();
  const isAthlete = profile?.role === "athlete";

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>("basics");

  const ap = athleteProfile;
  const [dateOfBirth, setDateOfBirth] = useState(ap?.date_of_birth ?? "");
  const [gender, setGender] = useState<string | null>(ap?.gender ?? null);
  const [city, setCity] = useState(ap?.city ?? "");
  const [heightCm, setHeightCm] = useState(numStr(ap?.height_cm));
  const [bodyweightKg, setBodyweightKg] = useState(numStr(ap?.bodyweight_kg));
  const [bodyFatPct, setBodyFatPct] = useState(numStr(ap?.body_fat_pct));
  const [weightClass, setWeightClass] = useState(ap?.weight_class ?? "");
  const [occupation, setOccupation] = useState(ap?.occupation ?? "");
  const [trainingExperience, setTrainingExperience] = useState(ap?.training_experience ?? "");
  const [powerliftingExperience, setPowerliftingExperience] = useState(ap?.powerlifting_experience ?? "");
  const [federation, setFederation] = useState(ap?.federation ?? "");
  const [meetDate, setMeetDate] = useState(ap?.meet_date ?? "");
  const [meetsDone, setMeetsDone] = useState(numStr(ap?.meets_done));
  const [currentGoal, setCurrentGoal] = useState(ap?.current_goal ?? "");
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<string | null>(
    ap?.training_days_per_week ? String(ap.training_days_per_week) : null
  );

  const [squatBest1rm, setSquatBest1rm] = useState(numStr(ap?.squat_1rm));
  const [squatBest3rm, setSquatBest3rm] = useState(numStr(ap?.squat_best_3rm));
  const [squatCompPr, setSquatCompPr] = useState(numStr(ap?.squat_competition_pr));
  const [benchBest1rm, setBenchBest1rm] = useState(numStr(ap?.bench_1rm));
  const [benchBest3rm, setBenchBest3rm] = useState(numStr(ap?.bench_best_3rm));
  const [benchCompPr, setBenchCompPr] = useState(numStr(ap?.bench_competition_pr));
  const [deadliftBest1rm, setDeadliftBest1rm] = useState(numStr(ap?.deadlift_1rm));
  const [deadliftBest3rm, setDeadliftBest3rm] = useState(numStr(ap?.deadlift_best_3rm));
  const [deadliftCompPr, setDeadliftCompPr] = useState(numStr(ap?.deadlift_competition_pr));

  const [trainingTime, setTrainingTime] = useState<string | null>(ap?.training_time ?? null);
  const [sessionDuration, setSessionDuration] = useState<string | null>(ap?.session_duration ?? null);
  const [wakeTime, setWakeTime] = useState(ap?.wake_time ?? "");
  const [sleepTime, setSleepTime] = useState(ap?.sleep_time ?? "");
  const [sleepHours, setSleepHours] = useState(numStr(ap?.sleep_hours));

  const [recoveryTools, setRecoveryTools] = useState<string[]>(ap?.recovery_tools ?? []);
  const [stressLevel, setStressLevel] = useState(ap?.stress_level ?? 5);
  const [sleepQuality, setSleepQuality] = useState(ap?.sleep_quality ?? 5);
  const [recoveryLevel, setRecoveryLevel] = useState(ap?.recovery_level ?? 5);

  const [squatBarType, setSquatBarType] = useState<string | null>(ap?.squat_style ?? null);
  const [squatStance, setSquatStance] = useState<string | null>(ap?.squat_stance ?? null);
  const [benchGrip, setBenchGrip] = useState<string | null>(ap?.bench_grip ?? null);
  const [benchArch, setBenchArch] = useState<string | null>(ap?.bench_arch ?? null);
  const [deadliftStyle, setDeadliftStyle] = useState<string | null>(ap?.deadlift_style ?? null);
  const [deadliftGrip, setDeadliftGrip] = useState<string | null>(ap?.deadlift_grip ?? null);

  const [medicalConditions, setMedicalConditions] = useState(ap?.medical_conditions ?? "");
  const [pastSurgeries, setPastSurgeries] = useState(ap?.past_surgeries ?? "");
  const [injuriesNotes, setInjuriesNotes] = useState(ap?.injuries_notes ?? "");

  const [dietType, setDietType] = useState<string | null>(ap?.diet_type ?? null);
  const [proteinIntakeG, setProteinIntakeG] = useState(numStr(ap?.protein_intake_g));
  const [waterIntakeL, setWaterIntakeL] = useState(numStr(ap?.water_intake_l));
  const [foodAllergies, setFoodAllergies] = useState(ap?.food_allergies ?? "");
  const [currentSupplements, setCurrentSupplements] = useState(ap?.current_supplements ?? "");

  const [equipmentAccess, setEquipmentAccess] = useState<string[]>(ap?.equipment_access ?? []);
  const [coachingNotes, setCoachingNotes] = useState(ap?.coaching_notes ?? "");

  function toggle(section: string) {
    setExpanded((prev) => (prev === section ? null : section));
  }

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq("id", session.user.id);
      if (profileError) throw profileError;

      if (isAthlete) {
        const { error: apError } = await supabase
          .from("athlete_profiles")
          .update({
            date_of_birth: dateOfBirth || null,
            age: ageFromDob(dateOfBirth),
            gender,
            city: city || null,
            height_cm: toNumber(heightCm),
            bodyweight_kg: toNumber(bodyweightKg),
            body_fat_pct: toNumber(bodyFatPct),
            weight_class: weightClass || null,
            occupation: occupation || null,
            training_experience: trainingExperience || null,
            powerlifting_experience: powerliftingExperience || null,
            federation: federation || null,
            meet_date: meetDate || null,
            meets_done: toNumber(meetsDone),
            current_goal: currentGoal || null,
            training_days_per_week: toNumber(trainingDaysPerWeek ?? ""),

            squat_1rm: toNumber(squatBest1rm),
            squat_best_3rm: toNumber(squatBest3rm),
            squat_competition_pr: toNumber(squatCompPr),
            bench_1rm: toNumber(benchBest1rm),
            bench_best_3rm: toNumber(benchBest3rm),
            bench_competition_pr: toNumber(benchCompPr),
            deadlift_1rm: toNumber(deadliftBest1rm),
            deadlift_best_3rm: toNumber(deadliftBest3rm),
            deadlift_competition_pr: toNumber(deadliftCompPr),

            training_time: trainingTime,
            session_duration: sessionDuration,
            wake_time: wakeTime || null,
            sleep_time: sleepTime || null,
            sleep_hours: toNumber(sleepHours),

            recovery_tools: recoveryTools.length ? recoveryTools : null,
            stress_level: stressLevel,
            sleep_quality: sleepQuality,
            recovery_level: recoveryLevel,

            squat_style: squatBarType,
            squat_stance: squatStance,
            bench_grip: benchGrip,
            bench_arch: benchArch,
            deadlift_style: deadliftStyle,
            deadlift_grip: deadliftGrip,

            medical_conditions: medicalConditions || null,
            past_surgeries: pastSurgeries || null,
            injuries_notes: injuriesNotes || null,

            diet_type: dietType,
            protein_intake_g: toNumber(proteinIntakeG),
            water_intake_l: toNumber(waterIntakeL),
            food_allergies: foodAllergies || null,
            current_supplements: currentSupplements || null,

            equipment_access: equipmentAccess.length ? equipmentAccess : null,
            coaching_notes: coachingNotes || null,
          })
          .eq("user_id", session.user.id);
        if (apError) throw apError;
        await refreshAthleteProfile();
      }

      alert("Saved", "Your profile has been updated.");
      navigation.goBack();
    } catch (err: any) {
      alert("Couldn't save changes", err.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="Basic Info" icon="person" expanded={expanded === "basics"} onToggle={() => toggle("basics")}>
          <AppTextInput label="Full Name" value={fullName} onChangeText={setFullName} />
          <AppTextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </Section>

        {isAthlete && (
          <>
            <Section title="Athlete Profile" icon="body" expanded={expanded === "profile"} onToggle={() => toggle("profile")}>
              <DateOfBirthField value={dateOfBirth} onChange={setDateOfBirth} />
              <ChipGroup label="Gender" options={["Male", "Female", "Other"]} value={gender} onChange={setGender} />
              <TextField label="City" value={city} onChangeText={setCity} />
              <HeightField valueCm={heightCm} onChangeCm={setHeightCm} />
              <NumberField label="Bodyweight" suffix="kg" value={bodyweightKg} onChangeText={setBodyweightKg} />
              <NumberField label="Body Fat" suffix="%" value={bodyFatPct} onChangeText={setBodyFatPct} />
              <TextField label="Weight Class" value={weightClass} onChangeText={setWeightClass} placeholder="e.g. 83kg" />
              <TextField label="Occupation" value={occupation} onChangeText={setOccupation} />
              <TextField label="Training Experience" value={trainingExperience} onChangeText={setTrainingExperience} placeholder="e.g. 3 years" />
              <TextField label="Powerlifting Experience" value={powerliftingExperience} onChangeText={setPowerliftingExperience} placeholder="e.g. 1 year" />
              <TextField label="Federation" value={federation} onChangeText={setFederation} placeholder="e.g. IPF, USPA" />
              <DateField label="Next Meet Date" value={meetDate} onChange={setMeetDate} />
              <NumberField label="Meets Done" value={meetsDone} onChangeText={setMeetsDone} />
              <TextField label="Current Goal" value={currentGoal} onChangeText={setCurrentGoal} multiline />
              <ChipGroup label="Training Days / Week" options={["3", "4", "5", "6", "7"]} value={trainingDaysPerWeek} onChange={setTrainingDaysPerWeek} />
            </Section>

            <Section title="Best Lift Numbers" icon="barbell" expanded={expanded === "lifts"} onToggle={() => toggle("lifts")}>
              <Text style={[typography.caption, { color: colors.accent, fontWeight: "700", textTransform: "uppercase", marginBottom: spacing.sm + 2 }]}>Squat</Text>
              <NumberField label="Best 1RM" value={squatBest1rm} onChangeText={setSquatBest1rm} />
              <NumberField label="Best 3RM" value={squatBest3rm} onChangeText={setSquatBest3rm} />
              <NumberField label="Competition PR" value={squatCompPr} onChangeText={setSquatCompPr} />
              <Text style={[typography.caption, { color: colors.accent, fontWeight: "700", textTransform: "uppercase", marginBottom: spacing.sm + 2, marginTop: spacing.xs }]}>Bench</Text>
              <NumberField label="Best 1RM" value={benchBest1rm} onChangeText={setBenchBest1rm} />
              <NumberField label="Best 3RM" value={benchBest3rm} onChangeText={setBenchBest3rm} />
              <NumberField label="Competition PR" value={benchCompPr} onChangeText={setBenchCompPr} />
              <Text style={[typography.caption, { color: colors.accent, fontWeight: "700", textTransform: "uppercase", marginBottom: spacing.sm + 2, marginTop: spacing.xs }]}>Deadlift</Text>
              <NumberField label="Best 1RM" value={deadliftBest1rm} onChangeText={setDeadliftBest1rm} />
              <NumberField label="Best 3RM" value={deadliftBest3rm} onChangeText={setDeadliftBest3rm} />
              <NumberField label="Competition PR" value={deadliftCompPr} onChangeText={setDeadliftCompPr} />
            </Section>

            <Section title="Training Information" icon="time" expanded={expanded === "training"} onToggle={() => toggle("training")}>
              <ChipGroup label="Training Time" options={["Morning", "Afternoon", "Evening", "Night"]} value={trainingTime} onChange={setTrainingTime} />
              <ChipGroup label="Session Duration" options={["<60m", "60-90m", "90-120m", "120m+"]} value={sessionDuration} onChange={setSessionDuration} />
              <TextField label="Wake Time" value={wakeTime} onChangeText={setWakeTime} placeholder="e.g. 6:30 AM" />
              <TextField label="Sleep Time" value={sleepTime} onChangeText={setSleepTime} placeholder="e.g. 11:00 PM" />
              <NumberField label="Sleep Hours" value={sleepHours} onChangeText={setSleepHours} />
            </Section>

            <Section title="Daily Routine & Recovery" icon="moon" expanded={expanded === "recovery"} onToggle={() => toggle("recovery")}>
              <MultiChipGroup label="Recovery Tools" options={RECOVERY_TOOLS} values={recoveryTools} onChange={setRecoveryTools} />
              <ScaleField label="Stress" value={stressLevel} onChange={setStressLevel} />
              <ScaleField label="Sleep Quality" value={sleepQuality} onChange={setSleepQuality} />
              <ScaleField label="Recovery" value={recoveryLevel} onChange={setRecoveryLevel} />
            </Section>

            <Section title="Technique Profile" icon="analytics" expanded={expanded === "technique"} onToggle={() => toggle("technique")}>
              <ChipGroup label="Squat Bar" options={["High Bar", "Low Bar", "SSB"]} value={squatBarType} onChange={setSquatBarType} />
              <ChipGroup label="Squat Stance" options={["Narrow", "Moderate", "Wide"]} value={squatStance} onChange={setSquatStance} />
              <ChipGroup label="Bench Grip" options={["Close", "Medium", "Wide"]} value={benchGrip} onChange={setBenchGrip} />
              <ChipGroup label="Bench Arch" options={["Low", "Moderate", "High"]} value={benchArch} onChange={setBenchArch} />
              <ChipGroup label="Deadlift Style" options={["Conventional", "Sumo"]} value={deadliftStyle} onChange={setDeadliftStyle} />
              <ChipGroup label="Deadlift Grip" options={["Hook", "Mixed", "Straps"]} value={deadliftGrip} onChange={setDeadliftGrip} />
            </Section>

            <Section title="Medical History" icon="medkit" expanded={expanded === "medical"} onToggle={() => toggle("medical")}>
              <TextField label="Medical Conditions / Medications" value={medicalConditions} onChangeText={setMedicalConditions} multiline />
              <TextField label="Past Surgeries" value={pastSurgeries} onChangeText={setPastSurgeries} multiline />
            </Section>

            <Section title="Injury History" icon="bandage" expanded={expanded === "injuries"} onToggle={() => toggle("injuries")}>
              <TextField label="Details" value={injuriesNotes} onChangeText={setInjuriesNotes} multiline />
            </Section>

            <Section title="Nutrition & Supplementation" icon="nutrition" expanded={expanded === "nutrition"} onToggle={() => toggle("nutrition")}>
              <ChipGroup label="Diet Type" options={["Vegetarian", "Egg Vegetarian", "Non-Vegetarian"]} value={dietType} onChange={setDietType} />
              <NumberField label="Protein Intake" suffix="g/day" value={proteinIntakeG} onChangeText={setProteinIntakeG} />
              <NumberField label="Water Intake" suffix="L/day" value={waterIntakeL} onChangeText={setWaterIntakeL} />
              <TextField label="Foods Avoided / Allergies" value={foodAllergies} onChangeText={setFoodAllergies} multiline />
              <TextField label="Current Supplements" value={currentSupplements} onChangeText={setCurrentSupplements} multiline />
            </Section>

            <Section title="Equipment & Gym Access" icon="construct" expanded={expanded === "equipment"} onToggle={() => toggle("equipment")}>
              <MultiChipGroup label="Available Equipment" options={EQUIPMENT_OPTIONS} values={equipmentAccess} onChange={setEquipmentAccess} />
            </Section>

            <Section title="Additional Notes" icon="document-text" expanded={expanded === "notes"} onToggle={() => toggle("notes")}>
              <TextField label="Coaching Information" value={coachingNotes} onChangeText={setCoachingNotes} multiline />
            </Section>
          </>
        )}

        <AnimatedPressable
          style={{
            backgroundColor: colors.accent,
            borderRadius: radius.md,
            paddingVertical: spacing.lg,
            alignItems: "center",
            marginTop: spacing.sm,
          }}
          onPress={handleSave}
          disabled={saving || !fullName}
        >
          {saving ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={[typography.bodyStrong, { color: colors.accentText, fontSize: 16 }]}>Save Changes</Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
