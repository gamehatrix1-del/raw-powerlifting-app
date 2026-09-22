import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import { addInterval, thisMonday } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { Profile } from "../../types/profile";

const INACTIVE_AFTER_DAYS = 5;
const RENEWAL_GRACE_DAYS = 3;

const TONE_RANK: Record<"critical" | "warn" | "ok", number> = { critical: 0, warn: 1, ok: 2 };

interface AthleteRow {
  profile: Profile;
  latestProgramWeek: string | null;
  onboarded: boolean;
  lastLoggedAt: string | null;
  payment: { status: string; paidAt: string | null; billingInterval: "monthly" | "quarterly" | "yearly" | null } | null;
  unreadCount: number;
}

export default function DashboardScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const alert = useAppAlert();
  const [rows, setRows] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "needs_intake" | "inactive" | "payment_issues">("all");
  const [broadcastVisible, setBroadcastVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);

    const { data: athletes, error: athletesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "athlete")
      .order("full_name", { ascending: true });

    if (athletesError) {
      console.error("Failed to load athletes", athletesError);
      setError(true);
      setLoading(false);
      return;
    }

    const { data: programs, error: programsError } = await supabase
      .from("programs")
      .select("athlete_id, week_start_date")
      .order("week_start_date", { ascending: false });

    if (programsError) {
      console.error("Failed to load programs", programsError);
    }

    const { data: athleteProfiles, error: athleteProfilesError } = await supabase
      .from("athlete_profiles")
      .select("user_id, onboarded_at");

    if (athleteProfilesError) {
      console.error("Failed to load athlete intake status", athleteProfilesError);
    }

    const since = new Date();
    since.setDate(since.getDate() - 60);
    const { data: recentLogs, error: logsError } = await supabase
      .from("workout_logs")
      .select("athlete_id, logged_at")
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: false });

    if (logsError) {
      console.error("Failed to load recent workout logs", logsError);
    }

    const { data: recentPayments, error: paymentsError } = await supabase
      .from("payments")
      .select("athlete_id, status, paid_at, created_at, plans(billing_interval)")
      .order("created_at", { ascending: false });

    if (paymentsError) {
      console.error("Failed to load payments", paymentsError);
    }

    const { data: unreadMessages, error: unreadError } = await supabase
      .from("messages")
      .select("athlete_id, sender_id")
      .is("read_at", null);

    if (unreadError) {
      console.error("Failed to load unread messages", unreadError);
    }

    const latestByAthlete = new Map<string, string>();
    for (const p of programs ?? []) {
      if (!latestByAthlete.has(p.athlete_id)) {
        latestByAthlete.set(p.athlete_id, p.week_start_date);
      }
    }

    const onboardedIds = new Set(
      (athleteProfiles ?? []).filter((p) => p.onboarded_at).map((p) => p.user_id)
    );

    const lastLogByAthlete = new Map<string, string>();
    for (const l of recentLogs ?? []) {
      if (!lastLogByAthlete.has(l.athlete_id)) {
        lastLogByAthlete.set(l.athlete_id, l.logged_at);
      }
    }

    const paymentByAthlete = new Map<string, AthleteRow["payment"]>();
    for (const p of (recentPayments as any[]) ?? []) {
      if (!paymentByAthlete.has(p.athlete_id)) {
        paymentByAthlete.set(p.athlete_id, {
          status: p.status,
          paidAt: p.paid_at,
          billingInterval: p.plans?.billing_interval ?? null,
        });
      }
    }

    const unreadByAthlete = new Map<string, number>();
    for (const m of unreadMessages ?? []) {
      // Only count messages the athlete sent — a coach's own unread-by-the-
      // athlete messages shouldn't badge the coach's own dashboard.
      if (m.sender_id !== m.athlete_id) continue;
      unreadByAthlete.set(m.athlete_id, (unreadByAthlete.get(m.athlete_id) ?? 0) + 1);
    }

    setRows(
      ((athletes as Profile[]) ?? []).map((profile) => ({
        profile,
        latestProgramWeek: latestByAthlete.get(profile.id) ?? null,
        onboarded: onboardedIds.has(profile.id),
        lastLoggedAt: lastLogByAthlete.get(profile.id) ?? null,
        payment: paymentByAthlete.get(profile.id) ?? null,
        unreadCount: unreadByAthlete.get(profile.id) ?? 0,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  // Live unread badges/sorting — a coach shouldn't have to leave and
  // return to this screen to see that a message just arrived.
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  function statusFor(row: AthleteRow) {
    if (!row.onboarded) {
      return { label: "Needs intake", tone: "critical" as const };
    }
    if (!row.latestProgramWeek) {
      return { label: "No program yet", tone: "warn" as const };
    }
    if (row.latestProgramWeek < thisMonday()) {
      return { label: "Needs next week's program", tone: "warn" as const };
    }
    if (!row.lastLoggedAt) {
      return { label: "Never logged a workout", tone: "critical" as const };
    }
    const daysSinceLog = Math.floor((Date.now() - new Date(row.lastLoggedAt).getTime()) / 86400000);
    if (daysSinceLog >= INACTIVE_AFTER_DAYS) {
      return { label: `Inactive ${daysSinceLog}d`, tone: "critical" as const };
    }
    return { label: "Up to date", tone: "ok" as const };
  }

  function paymentStatusFor(row: AthleteRow) {
    if (!row.payment) return { label: "No plan", tone: "warn" as const };
    if (row.payment.status === "failed") return { label: "Payment failed", tone: "critical" as const };
    if (row.payment.status !== "paid") return { label: "Payment pending", tone: "warn" as const };
    if (row.payment.paidAt && row.payment.billingInterval) {
      // Calendar-accurate renewal date — same addInterval() the athlete's
      // own Home/Membership screens and the renewal-reminder cron job use,
      // so the coach never sees a different renewal status than the
      // athlete does for the same subscription.
      const renewsAt = addInterval(row.payment.paidAt, row.payment.billingInterval);
      const daysUntilRenewal = Math.floor((new Date(renewsAt).getTime() - Date.now()) / 86400000);
      if (daysUntilRenewal <= -RENEWAL_GRACE_DAYS) {
        return { label: "Renewal overdue", tone: "critical" as const };
      }
      if (daysUntilRenewal <= 0) {
        return { label: "Renewal due", tone: "warn" as const };
      }
    }
    return { label: "Paid", tone: "ok" as const };
  }

  function matchesFilter(row: AthleteRow, f: typeof filter) {
    if (f === "needs_intake") return !row.onboarded;
    if (f === "inactive") {
      const label = statusFor(row).label;
      return label.startsWith("Inactive") || label === "Never logged a workout";
    }
    if (f === "payment_issues") return paymentStatusFor(row).tone !== "ok";
    return true;
  }

  async function handleBroadcast(body: string) {
    const { data, error: broadcastError } = await supabase.functions.invoke("broadcast-message", {
      body: { body },
    });
    if (broadcastError) {
      alert("Couldn't send announcement", broadcastError.message ?? "Please try again.");
      return;
    }
    setBroadcastVisible(false);
    alert("Announcement sent", `Delivered to ${data?.sent ?? 0} athletes.`);
  }

  const filterCounts = useMemo(
    () => ({
      all: rows.length,
      needs_intake: rows.filter((r) => matchesFilter(r, "needs_intake")).length,
      inactive: rows.filter((r) => matchesFilter(r, "inactive")).length,
      payment_issues: rows.filter((r) => matchesFilter(r, "payment_issues")).length,
    }),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = rows.filter((r) => matchesFilter(r, filter));
    if (q) filtered = filtered.filter((r) => r.profile.full_name.toLowerCase().includes(q));

    // Surfaces what actually needs the coach's attention first — worst
    // status/payment tone, then unread messages, then alphabetical.
    return [...filtered].sort((a, b) => {
      const aRank = Math.min(TONE_RANK[statusFor(a).tone], TONE_RANK[paymentStatusFor(a).tone]);
      const bRank = Math.min(TONE_RANK[statusFor(b).tone], TONE_RANK[paymentStatusFor(b).tone]);
      if (aRank !== bRank) return aRank - bRank;
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      return a.profile.full_name.localeCompare(b.profile.full_name);
    });
  }, [rows, search, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 20, paddingHorizontal: spacing.xxl }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.lg }}>
        <Text style={[typography.title, { color: colors.text, flex: 1 }]}>Athletes</Text>
        <AnimatedPressable
          onPress={() => navigation.navigate("BulkAssignTemplate")}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", marginRight: spacing.sm }}
        >
          <Ionicons name="copy-outline" size={18} color={colors.accent} />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => setBroadcastVisible(true)}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="megaphone-outline" size={18} color={colors.accent} />
        </AnimatedPressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <Ionicons name="search" size={18} color={colors.faint} />
        <TextInput
          style={{ flex: 1, color: colors.text, paddingHorizontal: spacing.sm, paddingVertical: 12, fontSize: 15 }}
          placeholder="Search athletes"
          placeholderTextColor={colors.faint}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <AnimatedPressable onPress={() => setSearch("")} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color={colors.faint} />
          </AnimatedPressable>
        )}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.lg }}>
        {(
          [
            { key: "all", label: "All" },
            { key: "needs_intake", label: "Needs intake" },
            { key: "inactive", label: "Inactive" },
            { key: "payment_issues", label: "Payment issues" },
          ] as const
        ).map((chip) => {
          const active = filter === chip.key;
          return (
            <AnimatedPressable
              key={chip.key}
              onPress={() => setFilter(chip.key)}
              style={{
                backgroundColor: active ? colors.accent : colors.card,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: 7,
              }}
            >
              <Text
                style={[
                  typography.micro,
                  { color: active ? colors.accentText : colors.muted, letterSpacing: 0, fontWeight: "700" },
                ]}
              >
                {chip.label} ({filterCounts[chip.key]})
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <ErrorState message="Couldn't load athletes." onRetry={load} />
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => item.profile.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              message={
                rows.length === 0
                  ? "No athletes have signed up yet"
                  : filter !== "all"
                  ? "No athletes match this filter"
                  : "No athletes match your search"
              }
            />
          }
          renderItem={({ item }) => {
            const status = statusFor(item);
            const payment = paymentStatusFor(item);
            const toneColor = (tone: "critical" | "warn" | "ok") =>
              tone === "critical" ? colors.error : tone === "warn" ? colors.warning : colors.success;
            const initial = item.profile.full_name?.trim()?.[0]?.toUpperCase() ?? "?";

            return (
              <AnimatedPressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderRadius: radius.md,
                  marginBottom: spacing.sm + 2,
                  overflow: "hidden",
                }}
                onPress={() =>
                  navigation.navigate("AthleteDetail", {
                    athleteId: item.profile.id,
                    athleteName: item.profile.full_name,
                  })
                }
              >
                {/* A single glance at the color running down the list tells the
                    coach who needs attention before reading a word of text. */}
                <View style={{ width: 3, alignSelf: "stretch", backgroundColor: toneColor(status.tone) }} />

                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", padding: spacing.md + 2 }}>
                  <View
                    style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: colors.accentMuted,
                      alignItems: "center", justifyContent: "center",
                      marginRight: spacing.md,
                    }}
                  >
                    <Text style={[typography.bodyStrong, { color: colors.accent, fontSize: 15 }]}>{initial}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, { color: colors.text, fontSize: 15 }]} numberOfLines={1}>
                      {item.profile.full_name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3, gap: 5 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: toneColor(status.tone) }} />
                      <Text style={[typography.caption, { color: colors.muted, fontSize: 12.5, flexShrink: 1 }]} numberOfLines={1}>
                        {status.label}
                      </Text>
                    </View>
                    {payment.tone !== "ok" && (
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, gap: 4 }}>
                        <Ionicons name="card-outline" size={11} color={toneColor(payment.tone)} />
                        <Text style={[typography.caption, { color: toneColor(payment.tone), fontSize: 11.5 }]} numberOfLines={1}>
                          {payment.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {item.unreadCount > 0 && (
                    <View
                      style={{
                        minWidth: 19, height: 19, borderRadius: 9.5,
                        paddingHorizontal: 5,
                        backgroundColor: colors.accent,
                        alignItems: "center", justifyContent: "center",
                        marginLeft: spacing.sm,
                      }}
                    >
                      <Text style={[typography.micro, { color: colors.accentText, letterSpacing: 0, fontSize: 10 }]}>
                        {item.unreadCount}
                      </Text>
                    </View>
                  )}

                  <Ionicons name="chevron-forward" size={16} color={colors.faint} style={{ marginLeft: spacing.xs }} />
                </View>
              </AnimatedPressable>
            );
          }}
        />
      )}

      <BroadcastModal
        visible={broadcastVisible}
        athleteCount={rows.length}
        onClose={() => setBroadcastVisible(false)}
        onSend={handleBroadcast}
      />
    </View>
  );
}

function BroadcastModal({
  visible,
  athleteCount,
  onClose,
  onSend,
}: {
  visible: boolean;
  athleteCount: number;
  onClose: () => void;
  onSend: (body: string) => Promise<void>;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      await onSend(text);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }}>
            <Text style={[typography.heading, { color: colors.text, marginBottom: 4 }]}>Send Announcement</Text>
            <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.lg }]}>
              Goes to all {athleteCount} athletes' chat threads and their phones.
            </Text>

            <TextInput
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                borderRadius: radius.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                fontSize: 15,
                minHeight: 100,
                textAlignVertical: "top",
                marginBottom: spacing.lg,
              }}
              placeholder="e.g. Gym closed this Sunday for maintenance."
              placeholderTextColor={colors.faint}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
            />

            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <AnimatedPressable
                style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center" }}
                onPress={onClose}
              >
                <Text style={[typography.bodyStrong, { color: colors.muted }]}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={{ flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", opacity: !text.trim() ? 0.5 : 1 }}
                onPress={handleSend}
                disabled={!text.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Text style={[typography.bodyStrong, { color: colors.accentText }]}>Send</Text>
                )}
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
