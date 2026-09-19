import { ScrollView, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>{number}</Text>
        <Text style={[typography.heading, { color: colors.text, fontSize: 17 }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  const { colors, typography, spacing } = useTheme();
  return <Text style={[typography.body, { color: colors.muted, lineHeight: 21, marginBottom: spacing.sm }]}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ flexDirection: "row", marginBottom: spacing.xs + 2, paddingLeft: spacing.xs }}>
      <Text style={[typography.body, { color: colors.accent, marginRight: 8 }]}>•</Text>
      <Text style={[typography.body, { color: colors.muted, lineHeight: 21, flex: 1 }]}>{children}</Text>
    </View>
  );
}

export default function TermsOfServiceScreen() {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl * 2 }}
    >
      <Text style={[typography.caption, { color: colors.faint, marginBottom: spacing.lg }]}>
        Last updated September 19, 2026 · Governed by the laws of India
      </Text>

      <Section number="01" title="Using RPA">
        <P>
          RPA is a coaching platform: you complete an athlete intake, your coach builds you a training program, and
          you log your workouts in the app. By creating an account you agree to these terms.
        </P>
      </Section>

      <Section number="02" title="Accounts">
        <Bullet>You must provide accurate information, especially in your medical/injury history — your coach relies on it to program safely.</Bullet>
        <Bullet>You're responsible for keeping your password secure.</Bullet>
        <Bullet>One account per person; accounts aren't transferable.</Bullet>
      </Section>

      <Section number="03" title="Memberships & payment">
        <Bullet>Membership plans are billed monthly, quarterly, or yearly as shown at checkout, processed by Razorpay.</Bullet>
        <Bullet>Your membership renews automatically at the end of each billing period unless cancelled beforehand.</Bullet>
        <Bullet>Refunds are considered case-by-case within 7 days of a failed or accidental renewal. No refund is issued for partial periods already used.</Bullet>
      </Section>

      <Section number="04" title="Assumption of risk">
        <P>
          Powerlifting and strength training carry an inherent risk of injury. Your coach's programming is
          guidance, not medical advice — always stop if something feels wrong and consult a medical professional
          for any injury or condition. By using RPA you accept these risks for yourself.
        </P>
      </Section>

      <Section number="05" title="Acceptable use">
        <P>
          Don't misuse the platform: no impersonating another athlete or coach, no attempting to access another
          user's data, no abusive behavior toward coaching staff.
        </P>
      </Section>

      <Section number="06" title="Cancellation & termination">
        <P>
          You can cancel your membership at any time from the Profile tab; access continues until the end of the
          paid period. We may suspend accounts that violate these terms or engage in payment fraud.
        </P>
      </Section>

      <Section number="07" title="Limitation of liability">
        <P>
          RPA and its coaching staff are not liable for injuries arising from training, to the fullest extent
          permitted under the laws of India.
        </P>
      </Section>

      <Section number="08" title="Governing law">
        <P>These terms are governed by the laws of India.</P>
      </Section>

      <Section number="09" title="Contact">
        <View style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md + 2 }}>
          <Text style={[typography.bodyStrong, { color: colors.text }]}>RAW@ Powerlifting Academy (individual proprietor)</Text>
          <Text style={[typography.caption, { color: colors.accent, marginTop: 4, fontWeight: "700" }]}>gamehatrix1@gmail.com</Text>
        </View>
      </Section>
    </ScrollView>
  );
}
