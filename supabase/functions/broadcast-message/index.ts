// Coach-only: sends one message to every athlete's chat thread at once
// ("gym closed Sunday", "new equipment in") instead of messaging each
// athlete individually. Fans out server-side so the client makes one call
// regardless of roster size, and batches push notifications per Expo's
// push API (which accepts up to 100 messages per request).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const EXPO_PUSH_BATCH_SIZE = 100;

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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: callerProfile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (callerProfile?.role !== "coach") {
      return json({ error: "Only coaches can send announcements" }, 403);
    }

    const { body } = (await req.json()) as { body: string };
    if (!body || !body.trim()) {
      return json({ error: "body is required" }, 400);
    }

    const { data: athletes, error: athletesError } = await serviceClient
      .from("profiles")
      .select("id, push_token")
      .eq("role", "athlete");
    if (athletesError) throw athletesError;

    if (!athletes || athletes.length === 0) {
      return json({ sent: 0, pushed: 0 });
    }

    const { error: insertError } = await serviceClient.from("messages").insert(
      athletes.map((a) => ({ athlete_id: a.id, sender_id: user.id, body }))
    );
    if (insertError) throw insertError;

    const pushMessages = athletes
      .filter((a) => !!a.push_token)
      .map((a) => ({
        to: a.push_token,
        title: "Announcement from your coach",
        body,
        data: { type: "broadcast" },
        sound: "default",
      }));

    for (let i = 0; i < pushMessages.length; i += EXPO_PUSH_BATCH_SIZE) {
      const chunk = pushMessages.slice(i, i + EXPO_PUSH_BATCH_SIZE);
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      }).catch((err) => console.error("Failed to send broadcast push batch", err));
    }

    return json({ sent: athletes.length, pushed: pushMessages.length });
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
