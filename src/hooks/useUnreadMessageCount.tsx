import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// Live unread-message count for the athlete's own chat thread with their
// coach, shared via context so every consumer (the tab badge, the Home
// header bubble) reads the same value instead of each opening its own
// Supabase Realtime subscription — two subscriptions on the same channel
// topic throws ("cannot add postgres_changes callbacks... after
// subscribe()") and crashes the app.
const UnreadMessagesContext = createContext<number>(0);

export function UnreadMessagesProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  // Supabase hands out a new session object reference on every auth event
  // (e.g. token refresh) even for the same logged-in user. Keying `check`
  // and the effect below on the object itself — rather than the id string,
  // which only actually changes on a real login/logout — caused the
  // effect to tear down and immediately reopen a Realtime channel with the
  // same topic name on every refresh, racing the async unsubscribe and
  // crashing with "cannot add postgres_changes callbacks ... after
  // subscribe()".
  const userId = session?.user.id;
  const [count, setCount] = useState(0);

  const check = useCallback(async () => {
    if (!userId) return;
    const { count: unread } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", userId)
      .neq("sender_id", userId)
      .is("read_at", null);
    setCount(unread ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    check();
    const interval = setInterval(check, 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    const channel = supabase
      .channel(`unread-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `athlete_id=eq.${userId}` },
        () => check()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      sub.remove();
      supabase.removeChannel(channel);
    };
  }, [check, userId]);

  return (
    <UnreadMessagesContext.Provider value={count}>{children}</UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessageCount(): number {
  return useContext(UnreadMessagesContext);
}
