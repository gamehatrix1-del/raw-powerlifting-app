import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import AppTextInput from "../../components/AppTextInput";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";

export default function ForgotPasswordScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const alert = useAppAlert();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      alert("Couldn't send reset email", err.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: spacing.xl }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.accentMuted,
          alignItems: "center", justifyContent: "center",
          marginBottom: spacing.lg,
        }}
      >
        <Ionicons name="key-outline" size={26} color={colors.accent} />
      </View>

      {sent ? (
        <>
          <Text style={[typography.title, { color: colors.text, marginBottom: 4 }]}>Check your email</Text>
          <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.xxl, lineHeight: 21 }]}>
            If an account exists for {email.trim()}, we've sent a link to reset your password.
          </Text>
          <AnimatedPressable
            style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: "center" }}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={[typography.bodyStrong, { color: colors.accentText, fontSize: 16 }]}>Back to Log In</Text>
          </AnimatedPressable>
        </>
      ) : (
        <>
          <Text style={[typography.title, { color: colors.text, marginBottom: 4 }]}>Reset your password</Text>
          <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.xxl, lineHeight: 21 }]}>
            Enter the email on your account and we'll send you a link to set a new password.
          </Text>

          <AppTextInput
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <AnimatedPressable
            style={{
              backgroundColor: colors.accent,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: "center",
              marginTop: spacing.sm,
              opacity: !email ? 0.5 : 1,
            }}
            onPress={handleSubmit}
            disabled={submitting || !email}
          >
            {submitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={[typography.bodyStrong, { color: colors.accentText, fontSize: 16 }]}>Send Reset Link</Text>
            )}
          </AnimatedPressable>

          <AnimatedPressable
            style={{ marginTop: spacing.xl, alignItems: "center" }}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={[typography.body, { color: colors.muted }]}>
              Remembered it? <Text style={{ color: colors.accent, fontWeight: "700" }}>Log in</Text>
            </Text>
          </AnimatedPressable>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
