import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import ChatScreen from "../screens/ChatScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import InviteCodesScreen from "../screens/coach/InviteCodesScreen";
import PrivacyDataScreen from "../screens/PrivacyDataScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import ProfileScreen from "../screens/ProfileScreen";
import TermsOfServiceScreen from "../screens/TermsOfServiceScreen";
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
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: "Privacy Policy" }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ title: "Terms of Service" }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: "Change Password" }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: "Message Coach" }}
      />
      <Stack.Screen
        name="InviteCodes"
        component={InviteCodesScreen}
        options={{ title: "Invite Codes" }}
      />
    </Stack.Navigator>
  );
}
