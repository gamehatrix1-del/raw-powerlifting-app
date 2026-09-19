import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// A 7-day consistency strip — the "did you train today" visualization
// every modern fitness app leads with (Strava's weekly ring row, Whoop's
// day chips, Hevy's calendar dots).
export default function WeekStrip({
  completed,
  todayIndex,
}: {
  /** true/false for each of the 7 days, Monday first */
  completed: boolean[];
  todayIndex: number;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {DAY_LETTERS.map((letter, i) => {
        const isToday = i === todayIndex;
        const done = completed[i];
        return (
          <View key={i} style={{ alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.sm,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: done ? colors.accent : colors.cardAlt,
                borderWidth: isToday && !done ? 1.5 : 0,
                borderColor: colors.accent,
              }}
            >
              <Text
                style={[
                  typography.micro,
                  { color: done ? colors.accentText : isToday ? colors.accent : colors.faint, letterSpacing: 0 },
                ]}
              >
                {letter}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
