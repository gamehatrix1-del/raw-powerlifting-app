import { useRef, useState } from "react";
import {
  Animated,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

// Themed input with an animated focus highlight — replaces the flat,
// always-same-color boxes with something that visibly responds to touch.
export default function AppTextInput({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const { colors, typography, radius, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  function handleFocus(e: any) {
    setFocused(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 160,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  }

  function handleBlur(e: any) {
    setFocused(false);
    Animated.timing(anim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
    onBlur?.(e);
  }

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? colors.error : "transparent", colors.accent],
  });

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? (
        <Text
          style={[
            typography.caption,
            { color: focused ? colors.accent : colors.muted, marginBottom: 6 },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <Animated.View
        style={{
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: error && !focused ? colors.error : borderColor,
          backgroundColor: colors.card,
        }}
      >
        <TextInput
          style={[
            {
              color: colors.text,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
            },
            style,
          ]}
          placeholderTextColor={colors.faint}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </Animated.View>
      {error ? (
        <Text
          style={[typography.caption, { color: colors.error, marginTop: 4 }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
