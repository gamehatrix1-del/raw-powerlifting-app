import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

function digitsToDisplay(digits: string): string {
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += "-" + digits.slice(2, 4);
  if (digits.length > 4) out += "-" + digits.slice(4, 8);
  return out;
}

function isoToDigits(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return "";
  const [, y, m, d] = match;
  return `${d}${m}${y}`;
}

// Masked DD-MM-YYYY entry that emits a canonical ISO (YYYY-MM-DD) string to
// the caller once all 8 digits are in, matching what the `date` columns in
// Postgres expect while keeping the on-screen format consistent everywhere.
export default function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [digits, setDigits] = useState(() => isoToDigits(value));

  function handleChange(text: string) {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 8);
    setDigits(cleaned);
    if (cleaned.length === 8) {
      const d = cleaned.slice(0, 2);
      const m = cleaned.slice(2, 4);
      const y = cleaned.slice(4, 8);
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange("");
    }
  }

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
        }}
        placeholder="DD-MM-YYYY"
        placeholderTextColor={colors.faint}
        keyboardType="numeric"
        maxLength={10}
        value={digitsToDisplay(digits)}
        onChangeText={handleChange}
      />
    </View>
  );
}
