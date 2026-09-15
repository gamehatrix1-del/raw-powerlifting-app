import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { styles } from "./authStyles";

// Self-signup always creates an athlete account. There's a single coach
// (Rajat); that account is promoted manually with one SQL statement after
// he signs up — see docs/RAW_App_Build_Guide.md — so no one can grant
// themselves coach access through the app.
export default function SignupScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, fullName.trim(), "athlete");
      Alert.alert(
        "Check your email",
        "Confirm your address to finish creating your account, then log in."
      );
      navigation.navigate("Login");
    } catch (err: any) {
      Alert.alert("Couldn't sign up", err.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Join RAW@ Powerlifting Academy</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={styles.button}
        onPress={handleSubmit}
        disabled={submitting || !fullName || !email || !password}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
    </View>
  );
}
