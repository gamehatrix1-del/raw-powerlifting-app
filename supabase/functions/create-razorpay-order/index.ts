// Creates a Razorpay order for the calling athlete and records a
// "created" payments row. The client opens Razorpay Checkout with the
// returned order details; the payment is only marked "paid" once
// razorpay-webhook verifies Razorpay's server-to-server callback.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { planId } = await req.json();
    if (!planId) {
      return json({ error: "planId is required" }, 400);
    }

    const { data: plan, error: planError } = await userClient
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();
    if (planError || !plan) {
      return json({ error: "Plan not found" }, 404);
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const amountPaise = Math.round(plan.price_inr * 100);

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `plan_${planId}_${Date.now()}`,
        notes: { athlete_id: user.id, plan_id: planId },
      }),
    });

    if (!orderRes.ok) {
      const details = await orderRes.text();
      return json({ error: "Razorpay order creation failed", details }, 502);
    }

    const order = await orderRes.json();

    // Service role client: payments has no client-writable RLS policy by
    // design, so recording the "created" row has to happen server-side.
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { error: insertError } = await serviceClient.from("payments").insert({
      athlete_id: user.id,
      plan_id: planId,
      razorpay_order_id: order.id,
      amount_inr: plan.price_inr,
      status: "created",
    });
    if (insertError) {
      return json(
        { error: "Failed to record payment", details: insertError.message },
        500
      );
    }

    return json({
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      keyId,
      planName: plan.name,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
