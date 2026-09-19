import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MembershipScreen from "../screens/athlete/MembershipScreen";
import TransactionDetailScreen from "../screens/TransactionDetailScreen";
import { useTheme } from "../theme/ThemeContext";

const Stack = createNativeStackNavigator();

export default function AthleteMembershipStack() {
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
        name="MembershipHome"
        component={MembershipScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: "Transaction" }}
      />
    </Stack.Navigator>
  );
}
