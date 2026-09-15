import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProgramScreen from "../screens/athlete/ProgramScreen";
import WorkoutLogScreen from "../screens/athlete/WorkoutLogScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator();

export default function AthleteProgramStack() {
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
    </Stack.Navigator>
  );
}
