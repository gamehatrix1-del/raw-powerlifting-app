import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// The "nothing here yet" counterpart to ErrorState — one consistent
// icon + message treatment for every empty list/section in the app,
// instead of each screen inventing its own (some with an icon, most
// bare text, no two quite matching).
export default function EmptyState({
  icon,
  message,
  subtext,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  subtext?: string;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ alignItems: "center", padding: spacing.xxl }}>
      <Ionicons name={icon} size={26} color={colors.faint} style={{ marginBottom: spacing.md }} />
      <Text style={[typography.bodyStrong, { color: colors.text, textAlign: "center", fontSize: 15 }]}>
        {message}
      </Text>
      {subtext ? (
        <Text style={[typography.caption, { color: colors.muted, textAlign: "center", marginTop: 4 }]}>
          {subtext}
        </Text>
      ) : null}
    </View>
  );
}
