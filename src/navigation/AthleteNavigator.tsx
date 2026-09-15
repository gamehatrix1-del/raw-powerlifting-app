import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/athlete/HomeScreen";
import LibraryScreen from "../screens/athlete/LibraryScreen";
import MembershipScreen from "../screens/athlete/MembershipScreen";
import ProgressScreen from "../screens/athlete/ProgressScreen";
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
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Membership" component={MembershipScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
