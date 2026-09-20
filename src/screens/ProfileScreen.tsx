import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import { useAppAlert } from "../components/AppAlert";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <AnimatedPressable
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.sm + 2,
      }}
      onPress={onPress}
    >
      <View
        style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: colors.accentMuted,
          alignItems: "center", justifyContent: "center",
          marginRight: spacing.md,
        }}
      >
        <Ionicons name={icon} size={16} color={colors.accent} />
      </View>
      <Text style={[typography.bodyStrong, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </AnimatedPressable>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const alert = useAppAlert();
  const { profile, signOut } = useAuth();

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err: any) {
      alert("Couldn't log out", err.message ?? "Please try again.");
    }
  }

  const initial = profile?.full_name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.xl,
        paddingTop: insets.top + 28,
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          paddingVertical: spacing.xxl,
          marginBottom: spacing.xl,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.accentMuted,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.md,
          }}
        >
          <Text style={[typography.title, { color: colors.accent }]}>
            {initial}
          </Text>
        </View>
        <Text style={[typography.heading, { color: colors.text }]}>
          {profile?.full_name ?? "—"}
        </Text>
        <View
          style={{
            marginTop: 6,
            backgroundColor: colors.accentMuted,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: 4,
          }}
        >
          <Text
            style={[
              typography.micro,
              { color: colors.accent, textTransform: "uppercase" },
            ]}
          >
            {profile?.role}
          </Text>
        </View>
      </View>

      <MenuRow icon="create-outline" label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
      {profile?.role === "athlete" && (
        <MenuRow icon="chatbubble-outline" label="Message Coach" onPress={() => navigation.navigate("Chat")} />
      )}
      {profile?.role === "coach" && (
        <MenuRow icon="key-outline" label="Invite Codes" onPress={() => navigation.navigate("InviteCodes")} />
      )}
      <MenuRow icon="lock-closed-outline" label="Change Password" onPress={() => navigation.navigate("ChangePassword")} />
      <MenuRow icon="shield-checkmark-outline" label="Privacy & Data" onPress={() => navigation.navigate("PrivacyData")} />

      <AnimatedPressable
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.md,
          paddingVertical: spacing.md + 2,
          alignItems: "center",
          marginTop: spacing.lg,
        }}
        onPress={handleSignOut}
      >
        <Text style={[typography.bodyStrong, { color: colors.error }]}>
          Log Out
        </Text>
      </AnimatedPressable>
    </View>
  );
}
