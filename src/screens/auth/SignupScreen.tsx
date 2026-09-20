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

const HERO_HEIGHT = 240;
const LOGO_WIDTH = 148;
const LOGO_HEIGHT = LOGO_WIDTH * (1151 / 1597);

// Self-signup always creates an athlete account, gated by an invite code
// the coach generates and shares (see InviteCodesScreen) — this stays a
// private, capacity-limited roster rather than an open public app. There's
// a single coach (Rajat); that account is promoted manually with one SQL
// statement after he signs up — see docs/RAW_App_Build_Guide.md — so no
// one can grant themselves coach access through the app.
export default function SignupScreen({ navigation }: any) {
  const { colors, typography, spacing, radius, isDark } = useTheme();
  const alert = useAppAlert();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // No email confirmation step — signing up logs the athlete straight
      // in, and RootNavigator swaps away from this screen once the new
      // session lands.
      await signUp(email.trim(), password, fullName.trim(), "athlete", inviteCode.trim());
    } catch (err: any) {
      alert("Couldn't sign up", err.message ?? "Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior="padding"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={{ height: HERO_HEIGHT, overflow: "hidden" }}>
          <Svg width="100%" height="100%" style={{ position: "absolute" }}>
            <Defs>
              <LinearGradient id="heroSignup" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={isDark ? 0.3 : 0.15} />
                <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#heroSignup)" />
          </Svg>

          <Ionicons
            name="barbell"
            size={130}
            color={colors.accent}
            style={{
              position: "absolute",
              top: -24,
              right: -34,
              opacity: isDark ? 0.14 : 0.08,
              transform: [{ rotate: "22deg" }],
            }}
          />

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing.lg }}>
            <View
              style={{
                width: LOGO_WIDTH,
                height: LOGO_HEIGHT,
                borderRadius: radius.lg,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: colors.accent,
                shadowColor: colors.accent,
                shadowOpacity: isDark ? 0.5 : 0.3,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <Image
                source={require("../../../assets/logo.png")}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
            <Text
              style={[typography.micro, { color: colors.muted, marginTop: spacing.sm + 4, letterSpacing: 2.2 }]}
            >
              RAW@ POWERLIFTING ACADEMY
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}>
          <Text style={[typography.title, { color: colors.text, marginBottom: 4 }]}>
            Create your account
          </Text>
          <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.xxl }]}>
            Join RAW@ Powerlifting Academy
          </Text>

          <AppTextInput
            label="Full name"
            placeholder="Your name"
            value={fullName}
            onChangeText={setFullName}
          />
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
          <AppTextInput
            label="Invite code"
            placeholder="From your coach"
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={setInviteCode}
          />

          <AnimatedPressable
            style={{ flexDirection: "row", alignItems: "flex-start", marginTop: spacing.sm, marginBottom: spacing.lg, gap: spacing.sm }}
            onPress={() => setConsentAccepted((v) => !v)}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: consentAccepted ? colors.accent : colors.border,
                backgroundColor: consentAccepted ? colors.accent : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 1,
              }}
            >
              {consentAccepted && <Ionicons name="checkmark" size={14} color={colors.accentText} />}
            </View>
            <Text style={[typography.caption, { color: colors.muted, flex: 1, lineHeight: 18 }]}>
              I agree to the{" "}
              <Text style={{ color: colors.accent, fontWeight: "700" }} onPress={() => navigation.navigate("TermsOfService")}>
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text style={{ color: colors.accent, fontWeight: "700" }} onPress={() => navigation.navigate("PrivacyPolicy")}>
                Privacy Policy
              </Text>
              , including the collection of training and health data for coaching purposes.
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={{
              backgroundColor: colors.accent,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: "center",
              marginTop: spacing.sm,
              opacity: !consentAccepted ? 0.5 : 1,
            }}
            onPress={handleSubmit}
            disabled={submitting || !fullName || !email || !password || !inviteCode || !consentAccepted}
          >
            {submitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={[typography.bodyStrong, { color: colors.accentText, fontSize: 16 }]}>
                Create Account
              </Text>
            )}
          </AnimatedPressable>

          <AnimatedPressable
            style={{ marginTop: spacing.xl, alignItems: "center", paddingBottom: spacing.xxl }}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={[typography.body, { color: colors.muted }]}>
              Already have an account? <Text style={{ color: colors.accent, fontWeight: "700" }}>Log in</Text>
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
