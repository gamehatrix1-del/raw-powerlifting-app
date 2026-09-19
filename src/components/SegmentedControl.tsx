import { useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// iOS-style segmented control with a sliding pill indicator — replaces
// plain chip rows anywhere they're acting as tabs (day pickers, filters).
export default function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors, typography, radius } = useTheme();
  const [width, setWidth] = useState(0);
  const indicator = useRef(new Animated.Value(0)).current;
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const segmentWidth = width / (options.length || 1);

  useEffect(() => {
    Animated.spring(indicator, {
      toValue: activeIndex * segmentWidth,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }, [activeIndex, segmentWidth, indicator]);

  function handleLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  return (
    <View
      onLayout={handleLayout}
      style={{
        flexDirection: "row",
        backgroundColor: colors.cardAlt,
        borderRadius: radius.md,
        padding: 3,
        position: "relative",
      }}
    >
      {width > 0 && (
        <Animated.View
          style={{
            position: "absolute",
            top: 3,
            bottom: 3,
            left: 3,
            width: segmentWidth - 6,
            backgroundColor: colors.accent,
            borderRadius: radius.sm,
            transform: [{ translateX: indicator }],
            shadowColor: colors.shadow,
            shadowOpacity: 0.3,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 1 },
          }}
        />
      )}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{ flex: 1, paddingVertical: 9, alignItems: "center", zIndex: 1 }}
          >
            <Text
              style={[
                typography.caption,
                { color: active ? colors.accentText : colors.muted, fontWeight: "700" },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
