export type PaymentStatus = "created" | "paid" | "failed" | "refunded";

export interface Payment {
  id: string;
  athlete_id: string;
  plan_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount_inr: number;
  status: PaymentStatus;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
}
