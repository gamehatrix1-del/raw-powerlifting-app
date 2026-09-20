import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";

interface Message {
  id: string;
  athlete_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export default function ChatScreen({ route }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const isCoach = profile?.role === "coach";
  const params = (route.params ?? {}) as { athleteId?: string; athleteName?: string };
  const athleteId = params.athleteId ?? session?.user.id;
  const athleteName = params.athleteName;

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!athleteId) return;
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load messages", error);
      setLoading(false);
      return;
    }

    setMessages((data as Message[]) ?? []);
    setLoading(false);

    // Mark incoming messages as read now that the thread is open.
    if (session) {
      const unreadIds = (data ?? [])
        .filter((m) => m.sender_id !== session.user.id && !m.read_at)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds)
          .then(({ error: readError }) => {
            if (readError) console.error("Failed to mark messages read", readError);
          });
      }
    }
  }, [athleteId, session]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime feed for the thread — falls back to nothing dramatic if the
  // channel drops; reopening the screen always re-fetches via load().
  useEffect(() => {
    if (!athleteId) return;
    const channel = supabase
      .channel(`messages-${athleteId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `athlete_id=eq.${athleteId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          if (session && incoming.sender_id !== session.user.id) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", incoming.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteId, session]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || !session || !athleteId) return;
    setSending(true);
    setDraft("");

    const { data, error } = await supabase
      .from("messages")
      .insert({ athlete_id: athleteId, sender_id: session.user.id, body })
      .select()
      .single();

    setSending(false);

    if (error) {
      console.error("Failed to send message", error);
      setDraft(body);
      return;
    }

    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]));
    listRef.current?.scrollToEnd({ animated: true });

    // Best-effort push to the other party — never blocks the send that
    // already succeeded locally.
    try {
      let targetId = athleteId;
      if (!isCoach) {
        const { data: coach } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "coach")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        targetId = coach?.id ?? athleteId;
      }
      await supabase.functions.invoke("notify-athlete", {
        body: {
          athleteId: targetId,
          title: isCoach ? "Message from your coach" : `Message from ${profile?.full_name ?? "your athlete"}`,
          body,
          data: { type: "chat_message" },
        },
      });
    } catch (err) {
      console.error("Failed to send chat push", err);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          backgroundColor: colors.cardAlt,
        }}
      >
        <Ionicons name="information-circle-outline" size={13} color={colors.faint} />
        <Text style={[typography.micro, { color: colors.faint, letterSpacing: 0 }]}>
          Messages are kept for 7 days, then automatically deleted.
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ marginTop: 60, alignItems: "center" }}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.faint} style={{ marginBottom: spacing.sm }} />
              <Text style={[typography.body, { color: colors.muted, textAlign: "center" }]}>
                {isCoach
                  ? `Start the conversation with ${athleteName ?? "this athlete"}.`
                  : "Message your coach — questions, form checks, schedule changes."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === session?.user.id;
            return (
              <View
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  backgroundColor: mine ? colors.accent : colors.card,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.md + 2,
                  paddingVertical: spacing.sm + 2,
                  marginBottom: spacing.sm,
                  maxWidth: "80%",
                }}
              >
                <Text style={[typography.body, { color: mine ? colors.accentText : colors.text }]}>{item.body}</Text>
                <Text
                  style={[
                    typography.micro,
                    { color: mine ? colors.accentText : colors.faint, opacity: 0.7, marginTop: 4, letterSpacing: 0 },
                  ]}
                >
                  {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            );
          }}
        />
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.card,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            backgroundColor: colors.card,
            color: colors.text,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.lg,
            paddingVertical: 10,
            fontSize: 15,
            maxHeight: 100,
          }}
          placeholder="Message..."
          placeholderTextColor={colors.faint}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <AnimatedPressable
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: draft.trim() && !sending ? 1 : 0.5,
          }}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.accentText} />
          ) : (
            <Ionicons name="arrow-up" size={20} color={colors.accentText} />
          )}
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}
