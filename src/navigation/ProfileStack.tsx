import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EditProfileScreen from "../screens/EditProfileScreen";
import PrivacyDataScreen from "../screens/PrivacyDataScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useTheme } from "../theme/ThemeContext";

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
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
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Edit Profile" }}
      />
      <Stack.Screen
        name="PrivacyData"
        component={PrivacyDataScreen}
        options={{ title: "Privacy & Data" }}
      />
    </Stack.Navigator>
  );
}
