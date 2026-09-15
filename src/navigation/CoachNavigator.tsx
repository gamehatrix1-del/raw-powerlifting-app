import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CoachDashboardStack from "./CoachDashboardStack";
import LibraryScreen from "../screens/coach/LibraryScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
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
      <Tab.Screen name="Payments">
        {() => <PlaceholderScreen title="Payments" />}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
