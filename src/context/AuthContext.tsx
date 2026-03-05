"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { normalizeRole } from "@/src/lib/rbac";
import type { Profile, Role } from "@/src/types/database";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  refreshProfile: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (userId?: string) => {
    const id = userId ?? user?.id;
    if (!id) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) {
      setProfile(null);
      return;
    }

    setProfile(data);
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }
      const nextSession = data.session;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        await refreshProfile(nextSession.user.id);
      }
      setLoading(false);
    };

    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        await refreshProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    // Optimistically clear local state first so UI/logout navigation is instant.
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);

    let errorMessage: string | null = null;

    try {
      const result = (await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise<{ error: null }>((resolve) => {
          setTimeout(() => resolve({ error: null }), 1200);
        }),
      ])) as { error: { message?: string } | null };

      errorMessage = result.error?.message ?? null;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Sign out failed.";
    }

    return { error: errorMessage };
  };

  const value = useMemo(
    () => {
      const normalizedRole = normalizeRole((profile as { role?: string } | null)?.role ?? null);
      return {
      user,
      session,
      profile,
      role: normalizedRole,
      loading,
      signIn,
      signOut,
      refreshProfile,
    };
    },
    [loading, profile, session, user, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
