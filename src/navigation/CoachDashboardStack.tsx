import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme/ThemeContext";
import AthleteDetailScreen from "../screens/coach/AthleteDetailScreen";
import DashboardScreen from "../screens/coach/DashboardScreen";
import ProgramBuilderScreen from "../screens/coach/ProgramBuilderScreen";

const Stack = createNativeStackNavigator();

export default function CoachDashboardStack() {
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
        name="CoachDashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AthleteDetail"
        component={AthleteDetailScreen}
        options={({ route }: any) => ({ title: route.params?.athleteName ?? "" })}
      />
      <Stack.Screen
        name="ProgramBuilder"
        component={ProgramBuilderScreen}
        options={{ title: "Build Program" }}
      />
    </Stack.Navigator>
  );
}
