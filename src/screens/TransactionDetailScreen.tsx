import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import ErrorState from "../components/ErrorState";
import { formatDisplayDate } from "../lib/dates";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";

interface TransactionDetail {
  id: string;
  amount_inr: number;
  status: "created" | "paid" | "failed" | "refunded";
  failure_reason: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
  plan_name: string;
  billing_interval: string;
  athlete_name: string;
}

const STATUS_INFO: Record<
  TransactionDetail["status"],
  { icon: keyof typeof Ionicons.glyphMap; label: string; explanation: string; tone: "success" | "error" | "warning" }
> = {
  paid: {
    icon: "checkmark-circle",
    label: "Payment received",
    explanation: "This payment went through successfully and the membership is active.",
    tone: "success",
  },
  failed: {
    icon: "close-circle",
    label: "Payment didn't go through",
    explanation: "The athlete's payment attempt failed. No money was taken. They can try again from their Plans tab.",
    tone: "error",
  },
  created: {
    icon: "time",
    label: "Waiting for payment",
    explanation: "The athlete started checkout but hasn't completed payment yet. This will update automatically once they finish, or fail if they abandon it.",
    tone: "warning",
  },
  refunded: {
    icon: "arrow-undo-circle",
    label: "Refunded",
    explanation: "This payment was refunded to the athlete.",
    tone: "warning",
  },
};

function timeOfDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function TransactionDetailScreen({ route }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const { profile } = useAuth();
  const { paymentId } = route.params as { paymentId: string };
  const [txn, setTxn] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: loadError } = await supabase
      .from("payments")
      .select("*, plans(name, billing_interval), profiles(full_name)")
      .eq("id", paymentId)
      .maybeSingle();

    if (loadError || !data) {
      console.error("Failed to load transaction", loadError);
      setError(true);
      setLoading(false);
      return;
    }

    setTxn({
      id: data.id,
      amount_inr: data.amount_inr,
      status: data.status,
      failure_reason: data.failure_reason,
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      created_at: data.created_at,
      paid_at: data.paid_at,
      plan_name: data.plans?.name ?? "Plan",
      billing_interval: data.plans?.billing_interval ?? "monthly",
      athlete_name: data.profiles?.full_name ?? "Athlete",
    });
    setLoading(false);
  }, [paymentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !txn) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ErrorState message="Couldn't load this transaction." onRetry={load} />
      </View>
    );
  }

  const info = STATUS_INFO[txn.status];
  const toneColor = info.tone === "success" ? colors.success : info.tone === "error" ? colors.error : colors.warning;
  const toneMuted = info.tone === "success" ? colors.successMuted : info.tone === "error" ? colors.errorMuted : colors.warningMuted;
  const isCoach = profile?.role === "coach";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.xxl * 2 }}
    >
      <View
        style={{
          backgroundColor: toneMuted,
          borderRadius: radius.lg,
          padding: spacing.xl,
          alignItems: "center",
          marginBottom: spacing.xl,
        }}
      >
        <Ionicons name={info.icon} size={44} color={toneColor} />
        <Text style={[typography.heading, { color: toneColor, marginTop: spacing.sm, textAlign: "center" }]}>
          {info.label}
        </Text>
        <Text style={[typography.caption, { color: colors.text, marginTop: spacing.sm, textAlign: "center", lineHeight: 19 }]}>
          {info.explanation}
        </Text>
        {txn.status === "failed" && txn.failure_reason ? (
          <View style={{ backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.md, alignSelf: "stretch" }}>
            <Text style={[typography.micro, { color: colors.faint, marginBottom: 4 }]}>WHAT RAZORPAY SAID</Text>
            <Text style={[typography.caption, { color: colors.text }]}>{txn.failure_reason}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[typography.display, { color: colors.text, fontSize: 34, textAlign: "center", marginBottom: 4 }]}>
        ₹{txn.amount_inr.toLocaleString("en-IN")}
      </Text>
      <Text style={[typography.caption, { color: colors.muted, textAlign: "center", marginBottom: spacing.xxl }]}>
        {txn.plan_name} · {txn.billing_interval}
      </Text>

      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg }}>
        {isCoach && <Row label="Athlete" value={txn.athlete_name} colors={colors} typography={typography} spacing={spacing} />}
        <Row label="Date" value={formatDisplayDate(txn.created_at)} colors={colors} typography={typography} spacing={spacing} />
        <Row label="Time" value={timeOfDay(txn.created_at)} colors={colors} typography={typography} spacing={spacing} />
        {txn.paid_at && (
          <Row label="Paid on" value={`${formatDisplayDate(txn.paid_at)} · ${timeOfDay(txn.paid_at)}`} colors={colors} typography={typography} spacing={spacing} />
        )}
        <Row label="Status" value={txn.status[0].toUpperCase() + txn.status.slice(1)} colors={colors} typography={typography} spacing={spacing} />
        {txn.razorpay_order_id && (
          <Row label="Order ID" value={txn.razorpay_order_id} colors={colors} typography={typography} spacing={spacing} mono />
        )}
        {txn.razorpay_payment_id && (
          <Row label="Payment ID" value={txn.razorpay_payment_id} colors={colors} typography={typography} spacing={spacing} mono last />
        )}
      </View>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  colors,
  typography,
  spacing,
  mono,
  last,
}: {
  label: string;
  value: string;
  colors: any;
  typography: any;
  spacing: any;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm + 2,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
        gap: spacing.md,
      }}
    >
      <Text style={[typography.caption, { color: colors.muted }]}>{label}</Text>
      <Text
        style={[
          typography.caption,
          { color: colors.text, fontWeight: "600", flexShrink: 1, textAlign: "right", fontSize: mono ? 12 : undefined },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}
