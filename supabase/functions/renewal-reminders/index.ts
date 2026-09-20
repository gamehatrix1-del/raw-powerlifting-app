// Runs daily via pg_cron + pg_net (see migration 0011). For every athlete
// whose membership renews in the next REMINDER_WINDOW_DAYS days (and
// hasn't already been reminded for this specific payment cycle), sends a
// push notification so they can renew before it lapses — proactive,
// rather than only reacting after a payment has already failed.
//
// Deployed with --no-verify-jwt: the caller is a Postgres cron job, not an
// end user, so it authenticates via a dedicated shared secret (CRON_SECRET,
// stored both as a function secret and in Supabase Vault) instead of a
// Supabase JWT.
import { createClient } from "npm:@supabase/supabase-js@2";

const REMINDER_WINDOW_DAYS = 3;

function addInterval(isoDate: string, interval: string): Date {
  const d = new Date(isoDate);
  const months = interval === "monthly" ? 1 : interval === "quarterly" ? 3 : 12;
  d.setMonth(d.getMonth() + months);
  return d;
}

Deno.serve(async (req) => {
  const providedSecret = req.headers.get("x-cron-secret");
  if (!providedSecret || providedSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: payments, error: paymentsError } = await serviceClient
      .from("payments")
      .select("id, athlete_id, paid_at, renewal_reminder_sent_at, plans(billing_interval), profiles(push_token)")
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false });

    if (paymentsError) throw paymentsError;

    // Only the athlete's most recent paid payment matters — older ones
    // are superseded and shouldn't trigger a reminder.
    const latestByAthlete = new Map<string, (typeof payments)[number]>();
    for (const p of payments ?? []) {
      if (!latestByAthlete.has(p.athlete_id)) {
        latestByAthlete.set(p.athlete_id, p);
      }
    }

    const now = new Date();
    let sent = 0;

    for (const payment of latestByAthlete.values()) {
      if (payment.renewal_reminder_sent_at) continue;

      const interval = (payment.plans as any)?.billing_interval ?? "monthly";
      const renewsAt = addInterval(payment.paid_at, interval);
      const daysUntilRenewal = Math.floor((renewsAt.getTime() - now.getTime()) / 86400000);

      if (daysUntilRenewal < 0 || daysUntilRenewal > REMINDER_WINDOW_DAYS) continue;

      const pushToken = (payment.profiles as any)?.push_token;
      if (pushToken) {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            to: pushToken,
            title: "Membership renewal coming up",
            body:
              daysUntilRenewal === 0
                ? "Your membership renews today — renew now to keep training uninterrupted."
                : `Your membership renews in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"} — renew now to avoid a gap.`,
            data: { type: "renewal_reminder" },
            sound: "default",
          }),
        }).catch((err) => console.error("Failed to send renewal reminder push", err));
      }

      await serviceClient
        .from("payments")
        .update({ renewal_reminder_sent_at: now.toISOString() })
        .eq("id", payment.id);
      sent++;
    }

    return new Response(JSON.stringify({ checked: latestByAthlete.size, sent }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
