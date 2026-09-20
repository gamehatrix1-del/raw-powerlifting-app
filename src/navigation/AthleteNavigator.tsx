import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import HomeScreen from "../screens/athlete/HomeScreen";
import LibraryScreen from "../screens/athlete/LibraryScreen";
import ProgressScreen from "../screens/athlete/ProgressScreen";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
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
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnread = useCallback(async () => {
    if (!session) return;
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", session.user.id)
      .neq("sender_id", session.user.id)
      .is("read_at", null);
    setUnreadCount(count ?? 0);
  }, [session]);

  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkUnread();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [checkUnread]);

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
