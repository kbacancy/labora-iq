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

    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
      if (error) {
        console.error("Failed to refresh profile:", error.message);
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("Unexpected profile refresh error:", error);
      setProfile(null);
    }
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      try {
        if (nextSession?.user) {
          await refreshProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Unexpected auth bootstrap error:", error);
        setProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const loadSession = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Failed to load session:", error.message);
          await applySession(null);
          return;
        }
        await applySession(data.session);
      } catch (error) {
        console.error("Unexpected session load error:", error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    void loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setLoading(true);
      void applySession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
    }
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
