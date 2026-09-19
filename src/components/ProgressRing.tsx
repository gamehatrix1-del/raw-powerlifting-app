import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../theme/ThemeContext";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Whoop/Apple-Fitness-style ring: a faint full track behind an animated
// progress arc, with room for center content (a number, an icon) passed
// as children.
export default function ProgressRing({
  size = 72,
  strokeWidth = 7,
  progress,
  color,
  trackColor,
  children,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const animated = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    Animated.timing(animated, {
      toValue: clamped,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [clamped, animated]);

  const strokeDashoffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? colors.cardAlt}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? colors.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      {children}
    </View>
  );
}
