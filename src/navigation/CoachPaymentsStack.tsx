import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PaymentsScreen from "../screens/coach/PaymentsScreen";
import TransactionDetailScreen from "../screens/TransactionDetailScreen";
import { useTheme } from "../theme/ThemeContext";

const Stack = createNativeStackNavigator();

export default function CoachPaymentsStack() {
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
        name="PaymentsHome"
        component={PaymentsScreen}
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
