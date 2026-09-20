// Sends a push notification to one profile's device via Expo's push
// service. Despite the name (kept for backward compatibility with existing
// callers), the target isn't always an athlete — it's also used for chat
// messages in both directions.
//
// Three trusted cases, one endpoint: the gateway already verifies the JWT
// signature (this function is NOT deployed with --no-verify-jwt) —
//   1. a service-role token (a server-to-server call from another function)
//      is trusted outright;
//   2. a coach may notify anyone (assigning programs, payment alerts, or
//      messaging any athlete);
//   3. an athlete may only notify a coach (replying in their chat thread) —
//      never another athlete.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface NotifyBody {
  athleteId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { athleteId: targetId, title, body, data } = (await req.json()) as NotifyBody;
    if (!targetId || !title || !body) {
      return json({ error: "athleteId, title, and body are required" }, 400);
    }

    const isServiceRole = getJwtRole(token) === "service_role";

    if (!isServiceRole) {
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

      const { data: callerProfile } = await serviceClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (callerProfile?.role !== "coach") {
        // Not a coach — only allow an athlete notifying their coach.
        const { data: targetProfile } = await serviceClient
          .from("profiles")
          .select("role")
          .eq("id", targetId)
          .single();
        if (targetProfile?.role !== "coach") {
          return json({ error: "Athletes can only notify their coach" }, 403);
        }
      }
    }

    const { data: target, error: targetError } = await serviceClient
      .from("profiles")
      .select("push_token")
      .eq("id", targetId)
      .single();

    if (targetError || !target?.push_token) {
      // Not an error — the recipient just has no device registered yet.
      return json({ sent: false, reason: "No push token on file" });
    }

    const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: target.push_token,
        title,
        body,
        data: data ?? {},
        sound: "default",
      }),
    });

    const pushResult = await pushResponse.json();
    return json({ sent: true, result: pushResult });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function getJwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
