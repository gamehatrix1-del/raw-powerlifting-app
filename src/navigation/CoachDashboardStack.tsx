import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme/ThemeContext";
import AthleteDetailScreen from "../screens/coach/AthleteDetailScreen";
import BulkAssignTemplateScreen from "../screens/coach/BulkAssignTemplateScreen";
import ChatScreen from "../screens/ChatScreen";
import DashboardScreen from "../screens/coach/DashboardScreen";
import ProgramBuilderScreen from "../screens/coach/ProgramBuilderScreen";
import ProgramHistoryDetailScreen from "../screens/coach/ProgramHistoryDetailScreen";

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
      <Stack.Screen
        name="ProgramHistoryDetail"
        component={ProgramHistoryDetailScreen}
        options={({ route }: any) => ({ title: route.params?.programName ?? "Program" })}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }: any) => ({ title: route.params?.athleteName ?? "Chat" })}
      />
      <Stack.Screen
        name="BulkAssignTemplate"
        component={BulkAssignTemplateScreen}
        options={{ title: "Bulk Assign Template" }}
      />
    </Stack.Navigator>
  );
}
