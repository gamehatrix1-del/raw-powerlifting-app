import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeContext";
import { Plan, PlanInterval } from "../../types/plan";

const INTERVALS: PlanInterval[] = ["monthly", "quarterly", "yearly"];

interface TransactionRow {
  id: string;
  amount_inr: number;
  status: string;
  failure_reason: string | null;
  created_at: string;
  athlete_name: string;
  plan_name: string;
}

export default function PaymentsScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const alert = useAppAlert();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);

    const { data: plansData, error: plansError } = await supabase
      .from("plans")
      .select("*")
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
      .select("*, profiles(full_name), plans(name)")
      .order("created_at", { ascending: false });
    if (paymentsError) {
      console.error("Failed to load payments", paymentsError);
      setError(true);
      setLoading(false);
      return;
    }

    setTransactions(
      (paymentsData ?? []).map((row: any) => ({
        id: row.id,
        amount_inr: row.amount_inr,
        status: row.status,
        failure_reason: row.failure_reason,
        created_at: row.created_at,
        athlete_name: row.profiles?.full_name ?? "Athlete",
        plan_name: row.plans?.name ?? "Plan",
      }))
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  async function handleCreatePlan(input: {
    name: string;
    description: string;
    priceInr: string;
    interval: PlanInterval;
  }) {
    const { error } = await supabase.from("plans").insert({
      name: input.name,
      description: input.description || null,
      price_inr: Number(input.priceInr),
      billing_interval: input.interval,
      is_active: true,
    });
    if (error) {
      alert("Couldn't create plan", error.message);
      return;
    }
    setModalVisible(false);
    load();
  }

  async function applyPlanToggle(plan: Plan) {
    const { error } = await supabase
      .from("plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);
    if (error) {
      alert("Couldn't update plan", error.message);
      return;
    }
    load();
  }

  function togglePlanActive(plan: Plan) {
    if (!plan.is_active) {
      applyPlanToggle(plan);
      return;
    }
    alert(
      "Deactivate this plan?",
      `Athletes already on ${plan.name} keep their membership. New athletes won't be able to select it.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive", onPress: () => applyPlanToggle(plan) },
      ]
    );
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
        <ErrorState message="Couldn't load payments." onRetry={load} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: spacing.xxl, paddingBottom: 40 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <Text style={[typography.heading, { color: colors.text, fontSize: 20 }]}>Membership Plans</Text>
        <AnimatedPressable
          style={{ backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm }}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[typography.caption, { color: colors.accentText, fontWeight: "700" }]}>+ Add</Text>
        </AnimatedPressable>
      </View>

      {plans.length === 0 ? (
        <Text style={[typography.caption, { color: colors.muted }]}>No plans yet. Add one to get started.</Text>
      ) : (
        plans.map((plan) => (
          <AnimatedPressable
            key={plan.id}
            style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm + 2 }}
            onPress={() => togglePlanActive(plan)}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[typography.bodyStrong, { color: colors.text, fontSize: 16, flex: 1 }]}>{plan.name}</Text>
              <View
                style={{
                  borderRadius: 6,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                  backgroundColor: plan.is_active ? colors.successMuted : colors.cardAlt,
                }}
              >
                <Text style={[typography.micro, { color: plan.is_active ? colors.success : colors.faint, letterSpacing: 0 }]}>
                  {plan.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
            <Text style={[typography.caption, { color: colors.muted, marginTop: 4 }]}>
              ₹{plan.price_inr} / {plan.billing_interval}
            </Text>
            {plan.description ? (
              <Text style={[typography.caption, { color: colors.faint, marginTop: 4, fontSize: 12 }]}>{plan.description}</Text>
            ) : null}
          </AnimatedPressable>
        ))
      )}

      <Text style={[typography.heading, { color: colors.text, fontSize: 20, marginTop: spacing.xxl + 4, marginBottom: spacing.md + 2 }]}>
        Transactions
      </Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" message="No payments yet" subtext="Checkout goes live once Razorpay is wired up." />
        }
        renderItem={({ item }) => (
          <AnimatedPressable
            style={{
              flexDirection: "row",
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: spacing.md + 2,
              marginBottom: spacing.sm,
              alignItems: "flex-start",
              gap: spacing.sm,
            }}
            onPress={() => navigation.navigate("TransactionDetail", { paymentId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>{item.athlete_name}</Text>
              <Text style={[typography.caption, { color: colors.muted, marginTop: 2 }]}>
                {item.plan_name} · ₹{item.amount_inr}
              </Text>
              {item.status === "failed" && item.failure_reason ? (
                <Text style={[typography.caption, { color: colors.error, fontSize: 11, marginTop: 4, lineHeight: 15 }]}>
                  {item.failure_reason}
                </Text>
              ) : null}
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
                  {
                    color: item.status === "failed" ? colors.error : colors.success,
                    letterSpacing: 0,
                  },
                ]}
              >
                {item.status.toUpperCase()}
              </Text>
            </View>
          </AnimatedPressable>
        )}
      />

      <PlanModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreatePlan}
      />
    </ScrollView>
  );
}

function PlanModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    description: string;
    priceInr: string;
    interval: PlanInterval;
  }) => Promise<void>;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceInr, setPriceInr] = useState("");
  const [interval, setInterval] = useState<PlanInterval>("monthly");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setDescription("");
    setPriceInr("");
    setInterval("monthly");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), description, priceInr, interval });
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    marginBottom: spacing.md,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl, maxHeight: "85%" }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.lg }]}>New Plan</Text>

          <TextInput
            style={inputStyle}
            placeholder="Name (e.g. Monthly Coaching)"
            placeholderTextColor={colors.faint}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={inputStyle}
            placeholder="Price in INR"
            placeholderTextColor={colors.faint}
            keyboardType="numeric"
            value={priceInr}
            onChangeText={setPriceInr}
          />

          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
            {INTERVALS.map((i) => {
              const active = interval === i;
              return (
                <AnimatedPressable
                  key={i}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm + 2,
                    borderRadius: radius.sm,
                    alignItems: "center",
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: active ? colors.accent : "transparent",
                  }}
                  onPress={() => setInterval(i)}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: active ? colors.text : colors.muted, fontWeight: "600", textTransform: "capitalize" },
                    ]}
                  >
                    {i}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          <TextInput
            style={inputStyle}
            placeholder="Description (optional)"
            placeholderTextColor={colors.faint}
            value={description}
            onChangeText={setDescription}
          />

          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xs }}>
            <AnimatedPressable
              style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center" }}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={[typography.bodyStrong, { color: colors.muted }]}>Cancel</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={{
                flex: 1,
                backgroundColor: colors.accent,
                borderRadius: radius.md,
                paddingVertical: spacing.lg,
                alignItems: "center",
                opacity: !name || !priceInr ? 0.5 : 1,
              }}
              onPress={handleSubmit}
              disabled={!name || !priceInr || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accentText} />
              ) : (
                <Text style={[typography.bodyStrong, { color: colors.accentText }]}>Save</Text>
              )}
            </AnimatedPressable>
          </View>
        </ScrollView>
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
