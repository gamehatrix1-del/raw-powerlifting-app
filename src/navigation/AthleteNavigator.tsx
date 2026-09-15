import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/athlete/HomeScreen";
import ProgressScreen from "../screens/athlete/ProgressScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AthleteProgramStack from "./AthleteProgramStack";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();

export default function AthleteNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Program" component={AthleteProgramStack} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Membership">
        {() => <PlaceholderScreen title="Membership" />}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
