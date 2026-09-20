import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Share, Text, View } from "react-native";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";

interface InviteCode {
  id: string;
  code: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export default function InviteCodesScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const alert = useAppAlert();
  const { session } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: loadError } = await supabase
      .from("invite_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (loadError) {
      console.error("Failed to load invite codes", loadError);
      setError(true);
      setLoading(false);
      return;
    }

    setCodes((data as InviteCode[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    if (!session) return;
    setGenerating(true);
    try {
      const { data, error: insertError } = await supabase
        .from("invite_codes")
        .insert({ code: randomCode(), created_by: session.user.id })
        .select()
        .single();
      if (insertError) throw insertError;

      setCodes((prev) => [data as InviteCode, ...prev]);
      Share.share({
        message: `Join RAW@ Powerlifting Academy — download the app and use invite code ${data.code} to create your account.`,
      }).catch(() => {});
    } catch (err: any) {
      alert("Couldn't generate code", err.message ?? "Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 20, paddingHorizontal: spacing.xl }}>
      <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.lg }]}>
        Athletes need one of these codes to sign up — it keeps signups limited to people you've actually invited.
      </Text>

      <AnimatedPressable
        style={{
          backgroundColor: colors.accent,
          borderRadius: radius.md,
          paddingVertical: spacing.md + 2,
          alignItems: "center",
          marginBottom: spacing.lg,
          flexDirection: "row",
          justifyContent: "center",
          gap: spacing.sm,
        }}
        onPress={handleGenerate}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <>
            <Ionicons name="add" size={18} color={colors.accentText} />
            <Text style={[typography.bodyStrong, { color: colors.accentText }]}>Generate Invite Code</Text>
          </>
        )}
      </AnimatedPressable>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <ErrorState message="Couldn't load invite codes." onRetry={load} />
      ) : (
        <FlatList
          data={codes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.muted, textAlign: "center", marginTop: 40 }]}>
              No invite codes yet — generate one above.
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.md,
                padding: spacing.lg,
                marginBottom: spacing.sm + 2,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text style={[typography.bodyStrong, { color: colors.text, letterSpacing: 2 }]}>{item.code}</Text>
                <Text style={[typography.caption, { color: colors.muted, marginTop: 2 }]}>
                  {item.used_at ? `Used ${new Date(item.used_at).toLocaleDateString()}` : "Not used yet"}
                </Text>
              </View>
              <View
                style={{
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: 4,
                  backgroundColor: item.used_at ? colors.cardAlt : colors.successMuted,
                }}
              >
                <Text
                  style={[
                    typography.micro,
                    { color: item.used_at ? colors.faint : colors.success, letterSpacing: 0 },
                  ]}
                >
                  {item.used_at ? "USED" : "AVAILABLE"}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
