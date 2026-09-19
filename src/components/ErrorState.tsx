import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import AnimatedPressable from "./AnimatedPressable";

export default function ErrorState({
  message = "Something went wrong loading this.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  const { colors, typography, radius, spacing } = useTheme();
  return (
    <View style={{ alignItems: "center", padding: spacing.xxl }}>
      <Text
        style={[
          typography.body,
          { color: colors.muted, textAlign: "center", marginBottom: spacing.lg },
        ]}
      >
        {message}
      </Text>
      <AnimatedPressable
        style={{
          backgroundColor: colors.cardAlt,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm + 2,
        }}
        onPress={onRetry}
      >
        <Text style={[typography.bodyStrong, { color: colors.text }]}>Retry</Text>
      </AnimatedPressable>
    </View>
  );
}
