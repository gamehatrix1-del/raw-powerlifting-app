import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import IntakeScreen from "../screens/athlete/IntakeScreen";
import AthleteNavigator from "./AthleteNavigator";
import AuthNavigator from "./AuthNavigator";
import CoachNavigator from "./CoachNavigator";

export default function RootNavigator() {
  const { session, profile, athleteProfile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#E33A3A" />
      </View>
    );
  }

  if (!session || !profile) {
    return <AuthNavigator />;
  }

  if (profile.role === "coach") {
    return <CoachNavigator />;
  }

  if (!athleteProfile) {
    return <IntakeScreen />;
  }

  return <AthleteNavigator />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0C",
  },
});
