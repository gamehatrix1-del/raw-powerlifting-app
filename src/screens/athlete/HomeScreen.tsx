import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
import ErrorState from "../../components/ErrorState";
import ProgressRing from "../../components/ProgressRing";
import StatTile from "../../components/StatTile";
import WeekStrip from "../../components/WeekStrip";
import { useAuth } from "../../context/AuthContext";
import { useUnreadMessageCount } from "../../hooks/useUnreadMessageCount";
import { addInterval, computeStreak, dateKey, thisMonday } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { Program, ProgramDay } from "../../types/program";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export default function HomeScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, session } = useAuth();
  const unreadCount = useUnreadMessageCount();
  const [program, setProgram] = useState<Program | null>(null);
  const [todayDay, setTodayDay] = useState<ProgramDay | null>(null);
  const [plannedThisWeek, setPlannedThisWeek] = useState(0);
  const [doneThisWeek, setDoneThisWeek] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weekCompleted, setWeekCompleted] = useState<boolean[]>(Array(7).fill(false));
  const [renewalBanner, setRenewalBanner] = useState<{ daysUntil: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(false);

    const { data: latestProgram, error: programError } = await supabase
      .from("programs")
      .select("*")
      .eq("athlete_id", session.user.id)
      .order("week_start_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (programError) {
      console.error("Failed to load program", programError);
      setError(true);
      setLoading(false);
      return;
    }

    setProgram((latestProgram as Program) ?? null);

    if (latestProgram && latestProgram.week_start_date === thisMonday()) {
      const { data: days } = await supabase
        .from("program_days")
        .select("*")
        .eq("program_id", latestProgram.id)
        .order("day_number", { ascending: true });

      const allDays = (days as ProgramDay[]) ?? [];
      setPlannedThisWeek(allDays.filter((d) => !d.is_rest_day).length);
      setTodayDay(allDays[todayIndex] ?? null);
    } else {
      setPlannedThisWeek(0);
      setTodayDay(null);
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("logged_at")
      .eq("athlete_id", session.user.id)
      .gte("logged_at", since.toISOString());

    const dateKeys = new Set((logs ?? []).map((l) => dateKey(l.logged_at)));
    setStreak(computeStreak(dateKeys));

    const monday = thisMonday();
    const doneThisWeekCount = [...dateKeys].filter((k) => k >= monday).length;
    setDoneThisWeek(doneThisWeekCount);

    const mondayDate = new Date(monday + "T00:00:00");
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mondayDate);
      d.setDate(d.getDate() + i);
      return dateKeys.has(dateKey(d.toISOString()));
    });
    setWeekCompleted(week);

    const { data: latestPayment } = await supabase
      .from("payments")
      .select("paid_at, plans(billing_interval)")
      .eq("athlete_id", session.user.id)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPayment?.paid_at) {
      const interval = (latestPayment.plans as any)?.billing_interval ?? "monthly";
      const renewsAt = addInterval(latestPayment.paid_at, interval);
      const daysUntil = Math.floor((new Date(renewsAt).getTime() - Date.now()) / 86400000);
      setRenewalBanner(daysUntil <= 3 ? { daysUntil } : null);
    } else {
      setRenewalBanner(null);
    }

    setLoading(false);
  }, [session, todayIndex]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ErrorState message="Couldn't load your dashboard." onRetry={load} />
      </View>
    );
  }

  const weekProgress = plannedThisWeek > 0 ? doneThisWeek / plannedThisWeek : 0;
  const initial = profile?.full_name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.xl }}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.caption, { color: colors.muted }]}>{greeting()}</Text>
          <Text style={[typography.display, { color: colors.text, fontSize: 26, marginTop: 2 }]}>
            {profile?.full_name?.split(" ")[0] ?? "Athlete"}
          </Text>
        </View>
        <AnimatedPressable
          onPress={() => navigation.navigate("Profile", { screen: "Chat" })}
          style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: colors.card,
            alignItems: "center", justifyContent: "center",
            marginRight: spacing.md,
          }}
        >
          <Ionicons name="chatbubble-outline" size={19} color={colors.accent} />
          {unreadCount > 0 && (
            <View
              style={{
                position: "absolute", top: -2, right: -2,
                minWidth: 18, height: 18, borderRadius: 9,
                paddingHorizontal: 4,
                backgroundColor: colors.error,
                alignItems: "center", justifyContent: "center",
                borderWidth: 2, borderColor: colors.background,
              }}
            >
              <Text style={[typography.micro, { color: "#FFFFFF", fontSize: 10, letterSpacing: 0 }]}>
                {unreadCount}
              </Text>
            </View>
          )}
        </AnimatedPressable>
        <AnimatedPressable onPress={() => navigation.navigate("Profile", { screen: "ProfileHome" })}>
          <View
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: colors.accentMuted,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={[typography.bodyStrong, { color: colors.accent }]}>{initial}</Text>
          </View>
        </AnimatedPressable>
      </View>

      {renewalBanner && (
        <AnimatedPressable
          onPress={() => navigation.navigate("Membership", { screen: "MembershipHome" })}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: renewalBanner.daysUntil < 0 ? colors.errorMuted : colors.warningMuted,
            borderRadius: radius.lg,
            padding: spacing.md + 2,
            marginBottom: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <Ionicons
            name="card"
            size={18}
            color={renewalBanner.daysUntil < 0 ? colors.error : colors.warning}
          />
          <Text
            style={[
              typography.caption,
              { color: renewalBanner.daysUntil < 0 ? colors.error : colors.warning, flex: 1, fontWeight: "700" },
            ]}
          >
            {renewalBanner.daysUntil < 0
              ? "Your membership has lapsed — renew to keep training uninterrupted."
              : renewalBanner.daysUntil === 0
              ? "Your membership renews today."
              : `Your membership renews in ${renewalBanner.daysUntil} day${renewalBanner.daysUntil === 1 ? "" : "s"}.`}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={renewalBanner.daysUntil < 0 ? colors.error : colors.warning}
          />
        </AnimatedPressable>
      )}

      <AnimatedPressable
        style={{
          borderRadius: radius.lg,
          overflow: "hidden",
          marginBottom: spacing.lg,
          backgroundColor: colors.card,
          flexDirection: "row",
        }}
        onPress={() =>
          program
            ? navigation.navigate("Program", { screen: "ProgramHome" })
            : navigation.navigate("Profile", { screen: "Chat" })
        }
      >
        <View style={{ width: 3, backgroundColor: colors.accent }} />
        <View style={{ padding: spacing.xl, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.micro, { color: colors.accent, letterSpacing: 1 }]}>
                {todayDay ? `DAY ${todayDay.day_number}` : "TODAY"}
              </Text>
              <Text style={[typography.heading, { color: colors.text, fontSize: 19, marginTop: 6 }]} numberOfLines={2}>
                {todayDay
                  ? todayDay.is_rest_day
                    ? "Rest day"
                    : todayDay.day_label
                  : program
                  ? "Check your program"
                  : "No program yet"}
              </Text>
              <Text style={[typography.caption, { color: colors.muted, marginTop: 4 }]}>
                {todayDay
                  ? todayDay.is_rest_day
                    ? "Recover up — you've earned it"
                    : "Tap to view & log today's session"
                  : program
                  ? "No session scheduled today"
                  : "Message your coach to get one assigned"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: spacing.md,
                  backgroundColor: colors.accent,
                  alignSelf: "flex-start",
                  paddingHorizontal: spacing.md,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  gap: 6,
                }}
              >
                <Ionicons
                  name={todayDay ? (todayDay.is_rest_day ? "bed" : "barbell") : program ? "barbell" : "chatbubble"}
                  size={14}
                  color={colors.accentText}
                />
                <Text style={[typography.caption, { color: colors.accentText, fontWeight: "700" }]}>
                  {todayDay
                    ? todayDay.is_rest_day
                      ? "Rest"
                      : "Start session"
                    : program
                    ? "View program"
                    : "Message coach"}
                </Text>
              </View>
            </View>

            <ProgressRing size={70} strokeWidth={6} progress={weekProgress}>
              <Text style={[typography.bodyStrong, { color: colors.text, fontSize: 15 }]}>
                {doneThisWeek}/{plannedThisWeek || "–"}
              </Text>
            </ProgressRing>
          </View>
        </View>
      </AnimatedPressable>

      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.muted, marginBottom: spacing.md, fontWeight: "600" }]}>
          This week
        </Text>
        <WeekStrip completed={weekCompleted} todayIndex={todayIndex} />
      </View>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatTile icon="flame" value={String(streak)} label="Day streak" tone="accent" />
        <StatTile icon="checkmark-done" value={`${doneThisWeek}/${plannedThisWeek || "–"}`} label="Sessions this week" tone="success" />
      </View>
    </ScrollView>
  );
}
