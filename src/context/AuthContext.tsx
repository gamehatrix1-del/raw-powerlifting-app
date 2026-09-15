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
    role: UserRole
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAthleteProfile: () => Promise<void>;
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
    role: UserRole
  ) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
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
        refreshAthleteProfile,
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
