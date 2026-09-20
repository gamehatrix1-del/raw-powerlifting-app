// Runs weekly via pg_cron + pg_net (see migration 0012). Summarizes which
// onboarded, actively-programmed athletes haven't logged a workout in
// INACTIVE_AFTER_DAYS+ days, and pushes that digest to every coach —
// proactive, so the coach doesn't have to remember to open the Dashboard
// and check the "Inactive" filter chip.
//
// Deployed with --no-verify-jwt: authenticates via the same shared-secret
// pattern as renewal-reminders (CRON_SECRET, stored as a function secret
// and in Supabase Vault — never embedded in a migration file).
import { createClient } from "npm:@supabase/supabase-js@2";

const INACTIVE_AFTER_DAYS = 5;
const MAX_NAMES_IN_BODY = 4;

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

    const [{ data: athletes, error: athletesError }, { data: onboarded, error: onboardedError }, { data: programs, error: programsError }] =
      await Promise.all([
        serviceClient.from("profiles").select("id, full_name").eq("role", "athlete"),
        serviceClient.from("athlete_profiles").select("user_id").not("onboarded_at", "is", null),
        serviceClient.from("programs").select("athlete_id, week_start_date").order("week_start_date", { ascending: false }),
      ]);

    if (athletesError) throw athletesError;
    if (onboardedError) throw onboardedError;
    if (programsError) throw programsError;

    const onboardedIds = new Set((onboarded ?? []).map((o) => o.user_id));
    const latestProgramByAthlete = new Map<string, string>();
    for (const p of programs ?? []) {
      if (!latestProgramByAthlete.has(p.athlete_id)) {
        latestProgramByAthlete.set(p.athlete_id, p.week_start_date);
      }
    }

    const since = new Date();
    since.setDate(since.getDate() - 60);
    const { data: recentLogs, error: logsError } = await serviceClient
      .from("workout_logs")
      .select("athlete_id, logged_at")
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: false });
    if (logsError) throw logsError;

    const lastLogByAthlete = new Map<string, string>();
    for (const l of recentLogs ?? []) {
      if (!lastLogByAthlete.has(l.athlete_id)) {
        lastLogByAthlete.set(l.athlete_id, l.logged_at);
      }
    }

    const now = Date.now();
    const inactiveNames: string[] = [];

    for (const athlete of athletes ?? []) {
      if (!onboardedIds.has(athlete.id)) continue;
      if (!latestProgramByAthlete.has(athlete.id)) continue;

      const lastLoggedAt = lastLogByAthlete.get(athlete.id);
      const daysSinceLog = lastLoggedAt
        ? Math.floor((now - new Date(lastLoggedAt).getTime()) / 86400000)
        : Infinity;

      if (daysSinceLog >= INACTIVE_AFTER_DAYS) {
        inactiveNames.push(athlete.full_name);
      }
    }

    if (inactiveNames.length === 0) {
      return new Response(JSON.stringify({ inactiveCount: 0, sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: coaches, error: coachesError } = await serviceClient
      .from("profiles")
      .select("push_token")
      .eq("role", "coach")
      .not("push_token", "is", null);
    if (coachesError) throw coachesError;

    const namesList =
      inactiveNames.length > MAX_NAMES_IN_BODY
        ? `${inactiveNames.slice(0, MAX_NAMES_IN_BODY).join(", ")}, and ${inactiveNames.length - MAX_NAMES_IN_BODY} more`
        : inactiveNames.join(", ");

    const pushMessages = (coaches ?? [])
      .filter((c) => !!c.push_token)
      .map((c) => ({
        to: c.push_token,
        title: `${inactiveNames.length} athlete${inactiveNames.length === 1 ? "" : "s"} need a check-in`,
        body: `Haven't logged a workout in ${INACTIVE_AFTER_DAYS}+ days: ${namesList}`,
        data: { type: "at_risk_digest" },
        sound: "default",
      }));

    if (pushMessages.length > 0) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(pushMessages),
      }).catch((err) => console.error("Failed to send at-risk digest push", err));
    }

    return new Response(JSON.stringify({ inactiveCount: inactiveNames.length, sent: pushMessages.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
