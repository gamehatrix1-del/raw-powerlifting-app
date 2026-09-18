import { useRef } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
}

// Subtle scale-down-on-press feedback, built on core Animated (no native
// module) so it works without a rebuild. Animates the Pressable itself
// (rather than wrapping it in a child Animated.View) so styles like
// flex: 1 in a row still work normally.
export default function AnimatedPressable({
  style,
  onPressIn,
  onPressOut,
  ...props
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn(e: any) {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
    onPressIn?.(e);
  }

  function handlePressOut(e: any) {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
    onPressOut?.(e);
  }

  return (
    <AnimatedPressableBase
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
      {...props}
    />
  );
}
