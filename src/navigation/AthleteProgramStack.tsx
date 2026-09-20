import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProgramHistoryDetailScreen from "../screens/athlete/ProgramHistoryDetailScreen";
import ProgramHistoryListScreen from "../screens/athlete/ProgramHistoryListScreen";
import ProgramScreen from "../screens/athlete/ProgramScreen";
import WorkoutLogScreen from "../screens/athlete/WorkoutLogScreen";
import { useTheme } from "../theme/ThemeContext";

const Stack = createNativeStackNavigator();

export default function AthleteProgramStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ProgramHome"
        component={ProgramScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WorkoutLog"
        component={WorkoutLogScreen}
        options={({ route }: any) => ({ title: route.params?.dayLabel ?? "Workout" })}
      />
      <Stack.Screen
        name="ProgramHistory"
        component={ProgramHistoryListScreen}
        options={{ title: "Past Weeks" }}
      />
      <Stack.Screen
        name="ProgramHistoryDetail"
        component={ProgramHistoryDetailScreen}
        options={({ route }: any) => ({ title: route.params?.programName ?? "Program" })}
      />
    </Stack.Navigator>
  );
}
