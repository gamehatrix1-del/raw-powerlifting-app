import { Session } from "@supabase/supabase-js";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { registerForPushNotificationsAsync } from "../lib/notifications";
import { AthleteProfile, Profile, UserRole } from "../types/profile";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  athleteProfile: AthleteProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    inviteCode?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshAthleteProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        if (!nextSession) {
          setProfile(null);
          setAthleteProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (profileError) {
        console.error("Failed to load profile", profileError);
        setProfile(null);
        setAthleteProfile(null);
        setLoading(false);
        return;
      }

      const loadedProfile = profileData as Profile;
      setProfile(loadedProfile);
      registerForPushNotificationsAsync(session.user.id);

      if (loadedProfile.role !== "athlete") {
        setAthleteProfile(null);
        setLoading(false);
        return;
      }

      const { data: athleteData, error: athleteError } = await supabase
        .from("athlete_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (athleteError) {
        console.error("Failed to load athlete profile", athleteError);
      }
      setAthleteProfile((athleteData as AthleteProfile) ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    if (error) {
      console.error("Failed to refresh profile", error);
      return;
    }
    setProfile(data as Profile);
  }, [session]);

  const refreshAthleteProfile = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("athlete_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) {
      console.error("Failed to refresh athlete profile", error);
      return;
    }
    setAthleteProfile((data as AthleteProfile) ?? null);
  }, [session]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    inviteCode?: string
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role, invite_code: inviteCode } },
    });
    if (error) throw error;

    // Records explicit consent to the Privacy Policy / Terms at signup
    // (DPDP Act notice-and-consent requirement) rather than just implying
    // it from account creation.
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ consent_accepted_at: new Date().toISOString() })
        .eq("id", data.user.id);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  async function changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        athleteProfile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        refreshAthleteProfile,
        resetPassword,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
