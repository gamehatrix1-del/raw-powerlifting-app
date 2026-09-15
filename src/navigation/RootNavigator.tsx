import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import AthleteNavigator from "./AthleteNavigator";
import AuthNavigator from "./AuthNavigator";
import CoachNavigator from "./CoachNavigator";

export default function RootNavigator() {
  const { session, profile, loading } = useAuth();

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

  return profile.role === "coach" ? <CoachNavigator /> : <AthleteNavigator />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0C",
  },
});
