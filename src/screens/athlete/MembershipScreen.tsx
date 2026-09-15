import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { addInterval } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";
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

export default function MembershipScreen() {
  const { session } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    const { data: plansData } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("price_inr", { ascending: true });
    setPlans((plansData as Plan[]) ?? []);

    const { data: paymentsData } = await supabase
      .from("payments")
      .select("*, plans(name, billing_interval)")
      .eq("athlete_id", session.user.id)
      .order("created_at", { ascending: false });

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
    load();
  }, [load]);

  function handlePayNow(plan: Plan) {
    Alert.alert(
      "Checkout coming soon",
      `${plan.name} — ₹${plan.price_inr}/${plan.billing_interval}. Razorpay checkout will be wired up here once it's ready.`
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const latestPaid = payments.find((p) => p.status === "paid");
  const mostRecent = payments[0];
  const showFailedBanner = mostRecent?.status === "failed";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Membership</Text>

      {showFailedBanner && (
        <View style={styles.failedBanner}>
          <Text style={styles.failedBannerText}>
            Your last payment didn't go through. Try again below.
          </Text>
        </View>
      )}

      {latestPaid ? (
        <View style={styles.currentPlanCard}>
          <Text style={styles.currentPlanLabel}>Current plan</Text>
          <Text style={styles.currentPlanName}>{latestPaid.plan_name}</Text>
          {latestPaid.paid_at && (
            <Text style={styles.currentPlanRenewal}>
              Renews {addInterval(latestPaid.paid_at, latestPaid.billing_interval)}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.currentPlanCard}>
          <Text style={styles.currentPlanLabel}>No active membership</Text>
          <Text style={styles.currentPlanRenewal}>Pick a plan below</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Plans</Text>
      {plans.map((plan) => (
        <View key={plan.id} style={styles.planCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planMeta}>
              ₹{plan.price_inr} / {plan.billing_interval}
            </Text>
          </View>
          <Pressable style={styles.payButton} onPress={() => handlePayNow(plan)}>
            <Text style={styles.payButtonText}>Pay Now</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Payment history</Text>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No payments yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <Text style={styles.historyPlan}>{item.plan_name}</Text>
            <Text
              style={[
                styles.historyStatus,
                item.status === "failed" && styles.historyStatusFailed,
              ]}
            >
              ₹{item.amount_inr} · {item.status}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  failedBanner: {
    backgroundColor: "rgba(227,58,58,0.15)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  failedBannerText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  currentPlanCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
  },
  currentPlanLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  currentPlanName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  currentPlanRenewal: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  planName: {
    color: colors.text,
    fontWeight: "600",
  },
  planMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  payButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  payButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  historyPlan: {
    color: colors.text,
  },
  historyStatus: {
    color: colors.muted,
    fontSize: 13,
  },
  historyStatusFailed: {
    color: colors.accent,
  },
});
