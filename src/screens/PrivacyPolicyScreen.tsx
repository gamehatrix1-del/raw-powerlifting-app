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

function TableRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        paddingVertical: spacing.sm + 2,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
      }}
    >
      <Text style={[typography.caption, { color: colors.text, fontWeight: "700", width: 110 }]}>{label}</Text>
      <Text style={[typography.caption, { color: colors.muted, flex: 1, lineHeight: 18 }]}>{value}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl * 2 }}
    >
      <Text style={[typography.caption, { color: colors.faint, marginBottom: spacing.lg }]}>
        Last updated September 19, 2026
      </Text>

      <View style={{ backgroundColor: colors.accentMuted, borderRadius: radius.md, padding: spacing.md + 2, marginBottom: spacing.xl }}>
        <Text style={[typography.caption, { color: colors.text, lineHeight: 18 }]}>
          This policy covers the RPA (RAW@ Powerlifting Academy) app. We don't sell your data, and we don't use it
          for advertising — it exists only to run your coaching program.
        </Text>
      </View>

      <Section number="01" title="What we collect">
        <P>When you create an account and complete your athlete intake, we collect:</P>
        <View style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md + 2, marginTop: spacing.xs }}>
          <TableRow label="Account" value="Name, email, password (stored as a salted hash, never in plain text)" />
          <TableRow label="Profile" value="Date of birth, gender, city, height, bodyweight, body fat %, occupation" />
          <TableRow label="Training" value="Lift numbers, training/competition experience, federation, meet history and goals" />
          <TableRow label="Health" value="Medical conditions, medications, past surgeries, injury history — shared voluntarily so your coach can program safely" />
          <TableRow label="Lifestyle" value="Sleep, stress and recovery ratings, diet type, nutrition and supplement notes" />
          <TableRow label="Workouts" value="Every set you log: weight, reps, RPE, and when you logged it" />
          <TableRow
            label="Payment"
            value="Membership plan, amount, and status. Card/UPI details are handled entirely by Razorpay — we never see or store them"
            last
          />
        </View>
      </Section>

      <Section number="02" title="How we use it">
        <Bullet>To build and adjust your training program</Bullet>
        <Bullet>To show your coach your training and recovery data so they can coach you</Bullet>
        <Bullet>To track your progress over time (charts, personal records, streaks)</Bullet>
        <Bullet>To process membership payments and show your payment history</Bullet>
        <Bullet>To send account-related emails (password resets, payment confirmations)</Bullet>
      </Section>

      <Section number="03" title="Who can see it">
        <Bullet><Text style={{ fontWeight: "700" }}>You</Text> always have full access to your own data.</Bullet>
        <Bullet><Text style={{ fontWeight: "700" }}>Your assigned coach</Text> can see your intake profile, training programs, logged workouts, and payment status.</Bullet>
        <Bullet><Text style={{ fontWeight: "700" }}>Razorpay</Text>, our payment processor, receives what's needed to process a payment.</Bullet>
        <Bullet><Text style={{ fontWeight: "700" }}>Supabase</Text>, our database and authentication provider, stores the data on our behalf and does not use it for their own purposes.</Bullet>
        <P>We never share your data with any other third party, and never with advertisers.</P>
      </Section>

      <Section number="04" title="How long we keep it">
        <P>
          We keep your account data for as long as your account is active. If you delete your account, we delete
          your personal profile, training, and workout data within 30 days, except where we're required to keep
          payment records for tax or accounting purposes.
        </P>
      </Section>

      <Section number="05" title="Your rights under the DPDP Act">
        <P>As a Data Principal under India's Digital Personal Data Protection Act, 2023, you have the right to:</P>
        <Bullet><Text style={{ fontWeight: "700" }}>Access</Text> — see everything we hold about you. Use Profile → Privacy &amp; Data → Download my data for an instant export.</Bullet>
        <Bullet><Text style={{ fontWeight: "700" }}>Correction</Text> — fix inaccurate data any time in Profile → Edit Profile; changes apply everywhere immediately.</Bullet>
        <Bullet><Text style={{ fontWeight: "700" }}>Erasure</Text> — permanently delete your account and every record tied to it from Profile → Privacy &amp; Data.</Bullet>
        <Bullet><Text style={{ fontWeight: "700" }}>Withdraw consent</Text> — means deleting your account, since the app can't function without the data you agreed to provide.</Bullet>
        <Bullet><Text style={{ fontWeight: "700" }}>Grievance redressal</Text> — raise a complaint with our Grievance Officer below.</Bullet>
      </Section>

      <Section number="06" title="Security">
        <P>
          Data is encrypted in transit (TLS) and at rest. Access is restricted by row-level security, so athletes
          can only ever read their own records, and coach access is limited to their assigned athletes.
        </P>
      </Section>

      <Section number="07" title="Children's data">
        <P>
          RPA is intended for users aged 18 and older. Athletes aged 16–17 may use the app only with a parent or
          guardian's explicit consent — the app flags this during intake and asks the guardian to email us before
          intake is completed. We don't knowingly collect data from anyone under 16.
        </P>
      </Section>

      <Section number="08" title="Changes to this policy">
        <P>If this policy changes materially, we'll notify active users in-app before the change takes effect.</P>
      </Section>

      <Section number="09" title="Grievance Officer / Contact">
        <P>
          Under the DPDP Act, this is the designated contact for any question, correction request, or complaint
          about how your data is handled. We aim to acknowledge grievances within 7 days and resolve them within 30.
        </P>
        <View style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md + 2, marginTop: spacing.xs }}>
          <Text style={[typography.bodyStrong, { color: colors.text }]}>RAW@ Powerlifting Academy (individual proprietor)</Text>
          <Text style={[typography.caption, { color: colors.muted, marginTop: 4 }]}>Grievance Officer — India</Text>
          <Text style={[typography.caption, { color: colors.accent, marginTop: 4, fontWeight: "700" }]}>gamehatrix1@gmail.com</Text>
        </View>
      </Section>
    </ScrollView>
  );
}
