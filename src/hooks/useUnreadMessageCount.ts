import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// Live unread-message count for the athlete's own chat thread with their
// coach. Updates instantly over Supabase Realtime when a new message
// arrives (not just on a polling interval), so a badge using this hook
// behaves like a proper "message has arrived" bubble.
export function useUnreadMessageCount(): number {
  const { session } = useAuth();
  const [count, setCount] = useState(0);

  const check = useCallback(async () => {
    if (!session) return;
    const { count: unread } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", session.user.id)
      .neq("sender_id", session.user.id)
      .is("read_at", null);
    setCount(unread ?? 0);
  }, [session]);

  useEffect(() => {
    if (!session) {
      setCount(0);
      return;
    }

    check();
    const interval = setInterval(check, 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    const channel = supabase
      .channel(`unread-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `athlete_id=eq.${session.user.id}` },
        () => check()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      sub.remove();
      supabase.removeChannel(channel);
    };
  }, [check, session]);

  return count;
}
