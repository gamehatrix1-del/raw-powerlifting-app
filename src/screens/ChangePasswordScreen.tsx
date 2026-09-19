import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import { useAppAlert } from "../components/AppAlert";
import AppTextInput from "../components/AppTextInput";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";

export default function ChangePasswordScreen({ navigation }: any) {
  const { colors, typography, spacing } = useTheme();
  const alert = useAppAlert();
  const { changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 6;

  async function handleSubmit() {
    if (newPassword !== confirmPassword) {
      alert("Passwords don't match", "Make sure both fields are the same.");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password too short", "Use at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(newPassword);
      alert("Password updated", "Use your new password next time you log in.");
      navigation.goBack();
    } catch (err: any) {
      alert("Couldn't update password", err.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.accentMuted,
          alignItems: "center", justifyContent: "center",
          marginBottom: spacing.lg,
          marginTop: spacing.lg,
        }}
      >
        <Ionicons name="lock-closed-outline" size={24} color={colors.accent} />
      </View>
      <Text style={[typography.title, { color: colors.text, marginBottom: 4 }]}>Change password</Text>
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.xxl, lineHeight: 21 }]}>
        Choose a new password for your account.
      </Text>

      <AppTextInput
        label="New password"
        placeholder="At least 6 characters"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        error={tooShort ? "Password must be at least 6 characters" : undefined}
      />
      <AppTextInput
        label="Confirm new password"
        placeholder="••••••••"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={mismatch ? "Passwords don't match" : undefined}
      />

      <AnimatedPressable
        style={{
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 15,
          alignItems: "center",
          marginTop: spacing.sm,
          opacity: !newPassword || !confirmPassword ? 0.5 : 1,
        }}
        onPress={handleSubmit}
        disabled={submitting || !newPassword || !confirmPassword}
      >
        {submitting ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={[typography.bodyStrong, { color: colors.accentText, fontSize: 16 }]}>Update Password</Text>
        )}
      </AnimatedPressable>
    </KeyboardAvoidingView>
  );
}
