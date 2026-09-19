import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Share, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import { useAppAlert } from "../components/AppAlert";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";

function SectionLabel({ children }: { children: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Text
      style={[
        typography.micro,
        { color: colors.faint, marginTop: spacing.xl, marginBottom: spacing.sm, letterSpacing: 1 },
      ]}
    >
      {children}
    </Text>
  );
}

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

export default function PrivacyDataScreen({ navigation }: any) {
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
      <Text style={[typography.caption, { color: colors.muted, lineHeight: 19 }]}>
        RPA collects your training and health data only to run your coaching program. Here's how to read what we
        collect, get a copy, manage your account, or ask us to erase it — rights guaranteed under India's Digital
        Personal Data Protection Act.
      </Text>

      <SectionLabel>LEGAL</SectionLabel>
      <Row
        icon="document-text-outline"
        title="Privacy Policy"
        subtitle="What we collect and why"
        onPress={() => navigation.navigate("PrivacyPolicy")}
      />
      <Row
        icon="reader-outline"
        title="Terms of Service"
        subtitle="The rules of using RPA"
        onPress={() => navigation.navigate("TermsOfService")}
      />

      <SectionLabel>YOUR DATA</SectionLabel>
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

      <SectionLabel>ACCOUNT</SectionLabel>
      <Row
        icon="lock-closed-outline"
        title="Change password"
        subtitle="Update the password you log in with"
        onPress={() => navigation.navigate("ChangePassword")}
      />
    </ScrollView>
  );
}
