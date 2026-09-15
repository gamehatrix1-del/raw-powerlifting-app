// Public endpoint — Razorpay calls this server-to-server on payment
// events. Deployed with --no-verify-jwt (Razorpay doesn't send a Supabase
// JWT); instead every request's signature is verified against
// RAZORPAY_WEBHOOK_SECRET before anything is trusted or written.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !(await isValidSignature(rawBody, signature))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    await supabase
      .from("payments")
      .update({
        status: "paid",
        razorpay_payment_id: payment.id,
        paid_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", payment.order_id);
  } else if (event.event === "payment.failed") {
    const payment = event.payload.payment.entity;
    await supabase
      .from("payments")
      .update({
        status: "failed",
        razorpay_payment_id: payment.id,
        failure_reason: payment.error_description ?? "Payment failed",
      })
      .eq("razorpay_order_id", payment.order_id);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function isValidSignature(body: string, signature: string) {
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
