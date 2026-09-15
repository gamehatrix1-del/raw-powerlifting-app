import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function CoachNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#E33A3A",
        tabBarStyle: { backgroundColor: "#0B0B0C" },
      }}
    >
      <Tab.Screen name="Dashboard">
        {() => <PlaceholderScreen title="Coach Dashboard" />}
      </Tab.Screen>
      <Tab.Screen name="Library">
        {() => <PlaceholderScreen title="Exercise Library" />}
      </Tab.Screen>
      <Tab.Screen name="Payments">
        {() => <PlaceholderScreen title="Payments" />}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
