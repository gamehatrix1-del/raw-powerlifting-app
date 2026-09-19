import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Share, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import { useAppAlert } from "../components/AppAlert";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";

const PRIVACY_POLICY_URL = "https://claude.ai/artifact/L6NaRsJZk1XzpK44kbzv9u#privacy";
const TERMS_URL = "https://claude.ai/artifact/L6NaRsJZk1XzpK44kbzv9u#terms";

function Row({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
  busy,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  destructive?: boolean;
  busy?: boolean;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <AnimatedPressable
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.sm + 2,
      }}
      onPress={onPress}
      disabled={busy}
    >
      <View
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: destructive ? colors.errorMuted : colors.accentMuted,
          alignItems: "center", justifyContent: "center",
          marginRight: spacing.md,
        }}
      >
        <Ionicons name={icon} size={17} color={destructive ? colors.error : colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: destructive ? colors.error : colors.text }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.muted, marginTop: 2 }]}>{subtitle}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.faint} size="small" />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      )}
    </AnimatedPressable>
  );
}

export default function PrivacyDataScreen() {
  const { colors, typography, spacing } = useTheme();
  const alert = useAppAlert();
  const { session, profile, athleteProfile, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    if (!session) return;
    setExporting(true);
    try {
      const [{ data: workoutLogs }, { data: payments }] = await Promise.all([
        supabase.from("workout_logs").select("*").eq("athlete_id", session.user.id),
        supabase.from("payments").select("*").eq("athlete_id", session.user.id),
      ]);

      const bundle = {
        exported_at: new Date().toISOString(),
        profile,
        athlete_profile: athleteProfile,
        workout_logs: workoutLogs ?? [],
        payments: payments ?? [],
      };

      await Share.share({
        title: "RPA data export",
        message: JSON.stringify(bundle, null, 2),
      });
    } catch (err: any) {
      alert("Couldn't export your data", err.message ?? "Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function confirmDelete() {
    alert(
      "Delete your account?",
      "This permanently deletes your profile, training history, workout logs, and payment records. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Everything", style: "destructive", onPress: handleDelete },
      ]
    );
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await signOut();
    } catch (err: any) {
      alert("Couldn't delete your account", err.message ?? "Please try again, or email us directly.");
      setDeleting(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}
    >
      <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.lg, lineHeight: 19 }]}>
        RPA collects your training and health data only to run your coaching program. Here's how to see what's stored, get a copy, or ask us to erase it — rights guaranteed under India's Digital Personal Data Protection Act.
      </Text>

      <Row
        icon="document-text-outline"
        title="Privacy Policy"
        subtitle="What we collect and why"
        onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
      />
      <Row
        icon="reader-outline"
        title="Terms of Service"
        subtitle="The rules of using RPA"
        onPress={() => Linking.openURL(TERMS_URL)}
      />
      <Row
        icon="download-outline"
        title="Download my data"
        subtitle="Export everything we hold about you as a file"
        onPress={handleExport}
        busy={exporting}
      />
      <Row
        icon="trash-outline"
        title="Delete my account"
        subtitle="Permanently erase your account and all data"
        onPress={confirmDelete}
        destructive
        busy={deleting}
      />
    </ScrollView>
  );
}
