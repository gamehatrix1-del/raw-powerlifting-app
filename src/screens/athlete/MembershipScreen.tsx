import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { addInterval, formatDisplayDate } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { Plan } from "../../types/plan";

interface PaymentRow {
  id: string;
  amount_inr: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  plan_name: string;
  billing_interval: Plan["billing_interval"];
}

export default function MembershipScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const alert = useAppAlert();
  const { session } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(false);

    const { data: plansData, error: plansError } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("price_inr", { ascending: true });
    if (plansError) {
      console.error("Failed to load plans", plansError);
      setError(true);
      setLoading(false);
      return;
    }
    setPlans((plansData as Plan[]) ?? []);

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payments")
      .select("*, plans(name, billing_interval)")
      .eq("athlete_id", session.user.id)
      .order("created_at", { ascending: false });
    if (paymentsError) {
      console.error("Failed to load payments", paymentsError);
      setError(true);
      setLoading(false);
      return;
    }

    setPayments(
      (paymentsData ?? []).map((row: any) => ({
        id: row.id,
        amount_inr: row.amount_inr,
        status: row.status,
        created_at: row.created_at,
        paid_at: row.paid_at,
        plan_name: row.plans?.name ?? "Plan",
        billing_interval: row.plans?.billing_interval ?? "monthly",
      }))
    );

    setLoading(false);
  }, [session]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  async function handlePayNow(plan: Plan) {
    if (!session) return;
    setPayingPlanId(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-razorpay-order",
        { body: { planId: plan.id } }
      );
      if (error) throw error;

      await RazorpayCheckout.open({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "RAW@ Powerlifting Academy",
        description: data.planName,
        prefill: { email: session.user.email ?? undefined },
        theme: { color: colors.accent },
      });

      // The razorpay-webhook Edge Function marks the payment "paid"
      // server-side; give it a moment to land before refreshing.
      setTimeout(load, 1500);
      alert("Payment received", "Confirming with your coach shortly.");
    } catch (err: any) {
      // Previously only alerted for errors shaped like Razorpay's own
      // {code, description} — anything else (the create-razorpay-order
      // function failing, a network error before the checkout sheet even
      // opened, etc.) was silently swallowed: the button's spinner would
      // just reset with no explanation, indistinguishable from the sheet
      // never showing up at all. Always log and alert now, whatever the
      // error shape, so a real failure is never mistaken for nothing
      // happening.
      console.error("Payment failed", err);
      // react-native-razorpay rejects with { error: { code, description, ... } }
      // — description is one level deeper than the {code, description} shape
      // this used to assume, and Razorpay sometimes sets it to the literal
      // string "undefined" rather than omitting it. Falling straight back to
      // err.message in either case dumped the raw JSON error into the alert.
      const description = err?.error?.description ?? err?.description;
      const message = description && description !== "undefined" ? description : null;
      alert("Payment didn't go through", message ?? "Please try again.");
    } finally {
      setPayingPlanId(null);
    }
  }

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
        <ErrorState message="Couldn't load your membership." onRetry={load} />
      </View>
    );
  }

  const latestPaid = payments.find((p) => p.status === "paid");
  const mostRecent = payments[0];
  const showFailedBanner = mostRecent?.status === "failed";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 20, paddingHorizontal: spacing.xl }}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Membership</Text>

      {showFailedBanner && (
        <View
          style={{
            backgroundColor: colors.errorMuted,
            borderRadius: radius.md,
            padding: spacing.md + 2,
            marginBottom: spacing.lg,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={[typography.caption, { color: colors.error, fontWeight: "700", flex: 1 }]}>
            Your last payment didn't go through. Try again below.
          </Text>
        </View>
      )}

      <View
        style={{
          borderRadius: radius.lg,
          overflow: "hidden",
          marginBottom: spacing.xxl,
          backgroundColor: colors.card,
          flexDirection: "row",
        }}
      >
        <View style={{ width: 3, backgroundColor: latestPaid ? colors.accent : colors.faint }} />
        <View style={{ padding: spacing.xl, flex: 1 }}>
          {latestPaid ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
                <Text style={[typography.micro, { color: colors.accent, letterSpacing: 1 }]}>ACTIVE PLAN</Text>
              </View>
              <Text style={[typography.display, { color: colors.text, fontSize: 24, marginTop: 8 }]}>{latestPaid.plan_name}</Text>
              {latestPaid.paid_at && (
                <Text style={[typography.caption, { color: colors.muted, marginTop: 4 }]}>
                  Renews {formatDisplayDate(addInterval(latestPaid.paid_at, latestPaid.billing_interval))}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={[typography.heading, { color: colors.text }]}>No active membership</Text>
              <Text style={[typography.caption, { color: colors.muted, marginTop: 4 }]}>Pick a plan below to get started</Text>
            </>
          )}
        </View>
      </View>

      <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.sm + 2 }]}>Plans</Text>
      {plans.length === 0 && (
        <Text style={[typography.caption, { color: colors.muted }]}>
          Your coach hasn't published any plans yet. Check back soon.
        </Text>
      )}
      {plans.map((plan) => {
        const isCurrent = latestPaid?.plan_name === plan.name;
        return (
          <View
            key={plan.id}
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.sm + 2,
              borderWidth: isCurrent ? 1.5 : 0,
              borderColor: colors.accent,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[typography.bodyStrong, { color: colors.text, fontSize: 16 }]}>{plan.name}</Text>
                {isCurrent && (
                  <View style={{ backgroundColor: colors.accentMuted, borderRadius: radius.tag, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={[typography.micro, { color: colors.accent, letterSpacing: 0 }]}>CURRENT</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                <Text style={[typography.display, { color: colors.text, fontSize: 22, fontVariant: ["tabular-nums"] }]}>
                  ₹{plan.price_inr.toLocaleString("en-IN")}
                </Text>
                <Text style={[typography.caption, { color: colors.muted }]}>/ {plan.billing_interval}</Text>
              </View>
            </View>
            <AnimatedPressable
              style={{
                backgroundColor: colors.accent,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm + 2,
                minWidth: 90,
                alignItems: "center",
              }}
              onPress={() => handlePayNow(plan)}
              disabled={payingPlanId === plan.id}
            >
              {payingPlanId === plan.id ? (
                <ActivityIndicator color={colors.accentText} size="small" />
              ) : (
                <Text style={[typography.caption, { color: colors.accentText, fontWeight: "700" }]}>Pay Now</Text>
              )}
            </AnimatedPressable>
          </View>
        );
      })}

      <Text style={[typography.subheading, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm + 2 }]}>
        Payment history
      </Text>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListEmptyComponent={<EmptyState icon="receipt-outline" message="No payments yet" />}
        renderItem={({ item }) => (
          <AnimatedPressable
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: spacing.md + 2,
              marginBottom: spacing.sm,
              gap: spacing.sm,
            }}
            onPress={() => navigation.navigate("TransactionDetail", { paymentId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>{item.plan_name}</Text>
              <Text style={[typography.caption, { color: colors.muted, marginTop: 2 }]}>
                ₹{item.amount_inr}
              </Text>
            </View>
            <View
              style={{
                borderRadius: 6,
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                backgroundColor: item.status === "failed" ? colors.errorMuted : colors.successMuted,
              }}
            >
              <Text
                style={[
                  typography.micro,
                  { color: item.status === "failed" ? colors.error : colors.success, letterSpacing: 0 },
                ]}
              >
                {item.status.toUpperCase()}
              </Text>
            </View>
          </AnimatedPressable>
        )}
      />
    </View>
  );
}
