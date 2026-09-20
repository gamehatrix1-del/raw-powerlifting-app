import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useAppAlert } from "../../components/AppAlert";
import AppTextInput from "../../components/AppTextInput";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";

const HERO_HEIGHT = 360;
const LOGO_WIDTH = 216;
const LOGO_HEIGHT = LOGO_WIDTH * (1151 / 1597);

const HIGHLIGHTS = [
  { icon: "barbell" as const, label: "Structured\nprograms" },
  { icon: "trending-up" as const, label: "Tracked\nprogress" },
  { icon: "trophy" as const, label: "Meet\nready" },
];

export default function LoginScreen({ navigation }: any) {
  const { colors, typography, spacing, radius, isDark } = useTheme();
  const alert = useAppAlert();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      alert("Couldn't log in", err.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={{ height: HERO_HEIGHT, overflow: "hidden" }}>
          <Svg width="100%" height="100%" style={{ position: "absolute" }}>
            <Defs>
              <LinearGradient id="hero" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={isDark ? 0.32 : 0.16} />
                <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#hero)" />
          </Svg>

          <Ionicons
            name="barbell"
            size={170}
            color={colors.accent}
            style={{
              position: "absolute",
              top: -36,
              left: -46,
              opacity: isDark ? 0.14 : 0.08,
              transform: [{ rotate: "-24deg" }],
            }}
          />
          <Ionicons
            name="flame"
            size={110}
            color={colors.accent}
            style={{
              position: "absolute",
              top: 18,
              right: -18,
              opacity: isDark ? 0.16 : 0.09,
              transform: [{ rotate: "18deg" }],
            }}
          />

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing.xl }}>
            <View
              style={{
                width: LOGO_WIDTH,
                height: LOGO_HEIGHT,
                borderRadius: radius.xl,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: colors.accent,
                shadowColor: colors.accent,
                shadowOpacity: isDark ? 0.5 : 0.3,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            >
              <Image
                source={require("../../../assets/logo.png")}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>

            <Text style={[typography.display, { color: colors.text, marginTop: spacing.lg, fontSize: 30 }]}>
              RPA
            </Text>
            <Text
              style={[
                typography.micro,
                { color: colors.muted, marginTop: 2, letterSpacing: 2.4 },
              ]}
            >
              RAW@ POWERLIFTING ACADEMY
            </Text>

            <View style={{ flexDirection: "row", marginTop: spacing.lg, gap: spacing.xl }}>
              {HIGHLIGHTS.map((h) => (
                <View key={h.icon} style={{ alignItems: "center", width: 76 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.accentMuted,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Ionicons name={h.icon} size={18} color={colors.accent} />
                  </View>
                  <Text
                    style={[
                      typography.micro,
                      { color: colors.muted, textAlign: "center", letterSpacing: 0, lineHeight: 14 },
                    ]}
                  >
                    {h.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl }}>
          <Text style={[typography.title, { color: colors.text, marginBottom: 4 }]}>
            Welcome back
          </Text>
          <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.xxl }]}>
            Log in to continue your training.
          </Text>

          <AppTextInput
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <AppTextInput
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <AnimatedPressable
            style={{ alignSelf: "flex-end", marginTop: -spacing.sm, marginBottom: spacing.sm }}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>
              Forgot password?
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={{
              backgroundColor: colors.accent,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: "center",
              marginTop: spacing.sm,
            }}
            onPress={handleSubmit}
            disabled={submitting || !email || !password}
          >
            {submitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={[typography.bodyStrong, { color: colors.accentText, fontSize: 16 }]}>
                Log In
              </Text>
            )}
          </AnimatedPressable>

          <AnimatedPressable
            style={{ marginTop: spacing.xl, alignItems: "center", paddingBottom: spacing.xxl }}
            onPress={() => navigation.navigate("Signup")}
          >
            <Text style={[typography.body, { color: colors.muted }]}>
              New here? <Text style={{ color: colors.accent, fontWeight: "700" }}>Create an account</Text>
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
