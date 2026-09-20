import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/athlete/HomeScreen";
import LibraryScreen from "../screens/athlete/LibraryScreen";
import ProgressScreen from "../screens/athlete/ProgressScreen";
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
import AthleteMembershipStack from "./AthleteMembershipStack";
import AthleteProgramStack from "./AthleteProgramStack";
import ProfileStack from "./ProfileStack";
import { useTheme } from "../theme/ThemeContext";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home",
  Program: "barbell",
  Library: "library",
  Progress: "trending-up",
  Membership: "card",
  Profile: "person-circle",
};

const OUTLINE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  Program: "barbell-outline",
  Library: "library-outline",
  Progress: "trending-up-outline",
  Membership: "card-outline",
  Profile: "person-circle-outline",
};

export default function AthleteNavigator() {
  const { colors } = useTheme();
  const unreadCount = useUnreadMessageCount();

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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Program" component={AthleteProgramStack} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen
        name="Membership"
        component={AthleteMembershipStack}
        options={{ tabBarLabel: "Plans" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
    </Tab.Navigator>
  );
}
