import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function AthleteNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#E33A3A",
        tabBarStyle: { backgroundColor: "#0B0B0C" },
      }}
    >
      <Tab.Screen name="Home">
        {() => <PlaceholderScreen title="Home" />}
      </Tab.Screen>
      <Tab.Screen name="Program">
        {() => <PlaceholderScreen title="Weekly Program" />}
      </Tab.Screen>
      <Tab.Screen name="Progress">
        {() => <PlaceholderScreen title="Progress" />}
      </Tab.Screen>
      <Tab.Screen name="Membership">
        {() => <PlaceholderScreen title="Membership" />}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
