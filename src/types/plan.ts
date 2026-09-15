export type PlanInterval = "monthly" | "quarterly" | "yearly";

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_inr: number;
  billing_interval: PlanInterval;
  is_active: boolean;
  created_at: string;
}
