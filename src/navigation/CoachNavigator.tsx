import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CoachDashboardStack from "./CoachDashboardStack";
import LibraryScreen from "../screens/coach/LibraryScreen";
import PaymentsScreen from "../screens/coach/PaymentsScreen";
import ReportingScreen from "../screens/coach/ReportingScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: "people",
  Library: "library",
  Payments: "card",
  Reporting: "bar-chart",
  Profile: "person-circle",
};

const OUTLINE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: "people-outline",
  Library: "library-outline",
  Payments: "card-outline",
  Reporting: "bar-chart-outline",
  Profile: "person-circle-outline",
};

export default function CoachNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={focused ? ICONS[route.name] : OUTLINE_ICONS[route.name]}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={CoachDashboardStack} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Reporting" component={ReportingScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
