import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err: any) {
      Alert.alert("Couldn't log out", err.message ?? "Please try again.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{profile?.full_name ?? "—"}</Text>
      <Text style={styles.role}>{profile?.role}</Text>

      <Pressable style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0C",
    padding: 24,
    paddingTop: 80,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  role: {
    fontSize: 14,
    color: "#9A9A9F",
    textTransform: "capitalize",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#1B1B1E",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#E33A3A",
    fontSize: 16,
    fontWeight: "600",
  },
});
