import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CoachDashboardStack from "./CoachDashboardStack";
import LibraryScreen from "../screens/coach/LibraryScreen";
import PaymentsScreen from "../screens/coach/PaymentsScreen";
import ReportingScreen from "../screens/coach/ReportingScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();

export default function CoachNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen name="Dashboard" component={CoachDashboardStack} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Reporting" component={ReportingScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
