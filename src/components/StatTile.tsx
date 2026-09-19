import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// Bento-grid stat card — big tabular number, icon chip, label. The
// building block behind every "today" dashboard in Whoop/Strava/Hevy.
export default function StatTile({
  icon,
  value,
  label,
  tone = "accent",
  flex = 1,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tone?: "accent" | "success" | "warning" | "neutral";
  flex?: number;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  const toneColor =
    tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "neutral" ? colors.text : colors.accent;
  const toneMuted =
    tone === "success" ? colors.successMuted : tone === "warning" ? colors.warningMuted : tone === "neutral" ? colors.cardAlt : colors.accentMuted;

  return (
    <View
      style={{
        flex,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: toneMuted,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.md,
        }}
      >
        <Ionicons name={icon} size={15} color={toneColor} />
      </View>
      <Text
        style={[typography.display, { color: colors.text, fontSize: 24, fontVariant: ["tabular-nums"] }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[typography.caption, { color: colors.muted, marginTop: 2 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
