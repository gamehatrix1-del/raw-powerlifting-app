import Slider from "@react-native-community/slider";
import { useMemo, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import AnimatedPressable from "../../../components/AnimatedPressable";
import DateField from "../../../components/DateField";
import { useTheme } from "../../../theme/ThemeContext";

export { DateField };

export function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[typography.caption, { color: colors.muted, marginTop: 4, lineHeight: 18 }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg + 2 }}>
      <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.sm, fontWeight: "600" }]}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.card,
          color: colors.text,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: 13,
          fontSize: 15,
          minHeight: multiline ? 90 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export function NumberField({
  label,
  value,
  onChangeText,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suffix?: string;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg + 2 }}>
      <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.sm, fontWeight: "600" }]}>
        {label}
        {suffix ? ` (${suffix})` : ""}
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.card,
          color: colors.text,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: 13,
          fontSize: 15,
        }}
        placeholder="0"
        placeholderTextColor={colors.faint}
        keyboardType="numeric"
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9.]/g, ""))}
      />
    </View>
  );
}

export function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (next: string) => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg + 2 }}>
      <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.sm, fontWeight: "600" }]}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <AnimatedPressable
              key={option}
              style={{
                paddingHorizontal: spacing.md + 2,
                paddingVertical: spacing.sm + 2,
                borderRadius: radius.sm,
                backgroundColor: selected ? colors.accentMuted : colors.card,
                borderWidth: 1,
                borderColor: selected ? colors.accent : colors.border,
              }}
              onPress={() => onChange(option)}
            >
              <Text
                style={[
                  typography.caption,
                  { color: selected ? colors.text : colors.muted, fontWeight: "600" },
                ]}
              >
                {option}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

export function MultiChipGroup({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  function toggle(option: string) {
    if (values.includes(option)) {
      onChange(values.filter((v) => v !== option));
    } else {
      onChange([...values, option]);
    }
  }

  return (
    <View style={{ marginBottom: spacing.lg + 2 }}>
      <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.sm, fontWeight: "600" }]}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <AnimatedPressable
              key={option}
              style={{
                paddingHorizontal: spacing.md + 2,
                paddingVertical: spacing.sm + 2,
                borderRadius: radius.sm,
                backgroundColor: selected ? colors.accentMuted : colors.card,
                borderWidth: 1,
                borderColor: selected ? colors.accent : colors.border,
              }}
              onPress={() => toggle(option)}
            >
              <Text
                style={[
                  typography.caption,
                  { color: selected ? colors.text : colors.muted, fontWeight: "600" },
                ]}
              >
                {option}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

export function ScaleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg + 2 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={[typography.caption, { color: colors.muted, fontWeight: "600" }]}>{label}</Text>
        <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>{value}/10</Text>
      </View>
      <Slider
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.cardAlt}
        thumbTintColor={colors.accent}
        onValueChange={onChange}
      />
    </View>
  );
}

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 90 }, (_, i) => String(CURRENT_YEAR - 10 - i));

function calcAge(day: number, month: number, year: number): number | null {
  const dob = new Date(year, month, day);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_VISIBLE = 3;

function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  itemWidth,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  itemWidth: number;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const scrollRef = useRef<any>(null);
  const hasMounted = useRef(false);

  function scrollToIndex(index: number, animated: boolean) {
    scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated });
  }

  function handleMomentumEnd(e: any) {
    const index = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    onSelect(clamped);
  }

  return (
    <View style={{ width: itemWidth, height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE }}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: WHEEL_ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: WHEEL_ITEM_HEIGHT,
          backgroundColor: colors.accentMuted,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.accent,
        }}
      />
      <ScrollView
        ref={(ref) => {
          scrollRef.current = ref;
          if (ref && !hasMounted.current) {
            hasMounted.current = true;
            requestAnimationFrame(() => scrollToIndex(selectedIndex, false));
          }
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT }}
        style={{ height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE }}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <AnimatedPressable
              key={item}
              onPress={() => {
                scrollToIndex(index, true);
                onSelect(index);
              }}
              style={{
                height: WHEEL_ITEM_HEIGHT,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={[
                  isSelected ? typography.bodyStrong : typography.caption,
                  { color: isSelected ? colors.text : colors.faint },
                ]}
              >
                {item}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function DateOfBirthField({
  label = "Date of Birth",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  const parsed = useMemo(() => {
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) return { day: d, month: m - 1, year: y };
    }
    return { day: 1, month: 0, year: CURRENT_YEAR - 20 };
  }, [value]);

  function update(patch: Partial<typeof parsed>) {
    const next = { ...parsed, ...patch };
    const iso = `${next.year}-${String(next.month + 1).padStart(2, "0")}-${String(
      next.day
    ).padStart(2, "0")}`;
    onChange(iso);
  }

  const age = value ? calcAge(parsed.day, parsed.month, parsed.year) : null;

  return (
    <View style={{ marginBottom: spacing.lg + 2 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.muted, fontWeight: "600" }]}>{label}</Text>
        {age !== null && (
          <View style={{ backgroundColor: colors.accentMuted, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>
              Age {age}
            </Text>
          </View>
        )}
      </View>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.card,
          borderRadius: radius.md,
          padding: spacing.sm,
          justifyContent: "space-between",
        }}
      >
        <WheelColumn
          items={DAYS}
          selectedIndex={parsed.day - 1}
          onSelect={(i) => update({ day: i + 1 })}
          itemWidth={64}
        />
        <WheelColumn
          items={MONTHS}
          selectedIndex={parsed.month}
          onSelect={(i) => update({ month: i })}
          itemWidth={72}
        />
        <WheelColumn
          items={YEARS}
          selectedIndex={YEARS.indexOf(String(parsed.year))}
          onSelect={(i) => update({ year: Number(YEARS[i]) })}
          itemWidth={80}
        />
      </View>
    </View>
  );
}

const CM_PER_INCH = 2.54;

export function HeightField({
  label = "Height",
  valueCm,
  onChangeCm,
}: {
  label?: string;
  valueCm: string;
  onChangeCm: (cm: string) => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [unit, setUnit] = useState<"cm" | "ft">("cm");

  const { feet, inches } = useMemo(() => {
    const cm = Number(valueCm);
    if (!cm || Number.isNaN(cm)) return { feet: "", inches: "" };
    const totalInches = cm / CM_PER_INCH;
    const ft = Math.floor(totalInches / 12);
    const inch = Math.round(totalInches - ft * 12);
    return { feet: String(ft), inches: String(inch) };
  }, [valueCm]);

  function updateFromFeetInches(nextFeet: string, nextInches: string) {
    const ft = Number(nextFeet) || 0;
    const inch = Number(nextInches) || 0;
    const cm = (ft * 12 + inch) * CM_PER_INCH;
    onChangeCm(cm > 0 ? String(Math.round(cm * 10) / 10) : "");
  }

  return (
    <View style={{ marginBottom: spacing.lg + 2 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.muted, fontWeight: "600" }]}>{label}</Text>
        <View style={{ flexDirection: "row", backgroundColor: colors.card, borderRadius: radius.pill, padding: 3 }}>
          {(["cm", "ft"] as const).map((u) => {
            const active = unit === u;
            return (
              <AnimatedPressable
                key={u}
                onPress={() => setUnit(u)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: active ? colors.accent : "transparent",
                }}
              >
                <Text
                  style={[
                    typography.micro,
                    { color: active ? colors.accentText : colors.muted, letterSpacing: 0 },
                  ]}
                >
                  {u === "cm" ? "CM" : "FT / IN"}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      {unit === "cm" ? (
        <TextInput
          style={{
            backgroundColor: colors.card,
            color: colors.text,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: 13,
            fontSize: 15,
          }}
          placeholder="e.g. 178"
          placeholderTextColor={colors.faint}
          keyboardType="numeric"
          value={valueCm}
          onChangeText={(t) => onChangeCm(t.replace(/[^0-9.]/g, ""))}
        />
      ) : (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.lg }}>
            <TextInput
              style={{ flex: 1, color: colors.text, paddingVertical: 13, fontSize: 15 }}
              placeholder="5"
              placeholderTextColor={colors.faint}
              keyboardType="numeric"
              value={feet}
              onChangeText={(t) => updateFromFeetInches(t.replace(/[^0-9]/g, ""), inches)}
            />
            <Text style={[typography.caption, { color: colors.faint }]}>ft</Text>
          </View>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.lg }}>
            <TextInput
              style={{ flex: 1, color: colors.text, paddingVertical: 13, fontSize: 15 }}
              placeholder="10"
              placeholderTextColor={colors.faint}
              keyboardType="numeric"
              value={inches}
              onChangeText={(t) => updateFromFeetInches(feet, t.replace(/[^0-9]/g, ""))}
            />
            <Text style={[typography.caption, { color: colors.faint }]}>in</Text>
          </View>
        </View>
      )}
      {valueCm ? (
        <Text style={[typography.micro, { color: colors.faint, marginTop: 6, letterSpacing: 0 }]}>
          {unit === "cm" ? `≈ ${feet}' ${inches}"` : `≈ ${valueCm} cm`}
        </Text>
      ) : null}
    </View>
  );
}
