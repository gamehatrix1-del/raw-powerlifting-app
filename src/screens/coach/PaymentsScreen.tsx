import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { colors } from "../../theme/colors";
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

export default function PaymentsScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: plansData, error: plansError } = await supabase
      .from("plans")
      .select("*")
      .order("price_inr", { ascending: true });
    if (plansError) console.error("Failed to load plans", plansError);
    setPlans((plansData as Plan[]) ?? []);

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payments")
      .select("*, profiles(full_name), plans(name)")
      .order("created_at", { ascending: false });
    if (paymentsError) console.error("Failed to load payments", paymentsError);

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
    load();
  }, [load]);

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
      Alert.alert("Couldn't create plan", error.message);
      return;
    }
    setModalVisible(false);
    load();
  }

  async function togglePlanActive(plan: Plan) {
    const { error } = await supabase
      .from("plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);
    if (error) {
      Alert.alert("Couldn't update plan", error.message);
      return;
    }
    load();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Membership Plans</Text>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {plans.length === 0 ? (
        <Text style={styles.emptyText}>No plans yet. Add one to get started.</Text>
      ) : (
        plans.map((plan) => (
          <Pressable
            key={plan.id}
            style={styles.planCard}
            onPress={() => togglePlanActive(plan)}
          >
            <View style={styles.planCardHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <View
                style={[
                  styles.statusBadge,
                  plan.is_active ? styles.statusActive : styles.statusInactive,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {plan.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
            <Text style={styles.planMeta}>
              ₹{plan.price_inr} / {plan.billing_interval}
            </Text>
            {plan.description ? (
              <Text style={styles.planDescription}>{plan.description}</Text>
            ) : null}
          </Pressable>
        ))
      )}

      <Text style={[styles.title, styles.sectionSpacing]}>Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No payments yet. Checkout goes live once Razorpay is wired up.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txAthlete}>{item.athlete_name}</Text>
              <Text style={styles.txMeta}>
                {item.plan_name} · ₹{item.amount_inr}
              </Text>
              {item.status === "failed" && item.failure_reason ? (
                <Text style={styles.txFailureReason}>{item.failure_reason}</Text>
              ) : null}
            </View>
            <Text
              style={[
                styles.txStatus,
                item.status === "failed" && styles.txStatusFailed,
              ]}
            >
              {item.status}
            </Text>
          </View>
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

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New Plan</Text>

          <TextInput
            style={styles.input}
            placeholder="Name (e.g. Monthly Coaching)"
            placeholderTextColor={colors.faint}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Price in INR"
            placeholderTextColor={colors.faint}
            keyboardType="numeric"
            value={priceInr}
            onChangeText={setPriceInr}
          />

          <View style={styles.intervalRow}>
            {INTERVALS.map((i) => (
              <Pressable
                key={i}
                style={[
                  styles.intervalOption,
                  interval === i && styles.intervalOptionActive,
                ]}
                onPress={() => setInterval(i)}
              >
                <Text
                  style={[
                    styles.intervalOptionText,
                    interval === i && styles.intervalOptionTextActive,
                  ]}
                >
                  {i}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            placeholderTextColor={colors.faint}
            value={description}
            onChangeText={setDescription}
          />

          <View style={styles.modalFooter}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.primaryButton,
                (!name || !priceInr) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!name || !priceInr || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  sectionSpacing: {
    marginTop: 28,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  planMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  planDescription: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: "rgba(80,200,120,0.15)",
  },
  statusInactive: {
    backgroundColor: "rgba(154,154,159,0.15)",
  },
  statusBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  txRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    alignItems: "center",
  },
  txAthlete: {
    color: colors.text,
    fontWeight: "600",
  },
  txMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  txFailureReason: {
    color: colors.accent,
    fontSize: 11,
    marginTop: 2,
  },
  txStatus: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  txStatusFailed: {
    color: colors.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  intervalRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  intervalOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: "transparent",
  },
  intervalOptionActive: {
    borderColor: colors.accent,
  },
  intervalOptionText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  intervalOptionTextActive: {
    color: colors.text,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
