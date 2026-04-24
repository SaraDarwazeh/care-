"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { AppUser } from "@/lib/types";
import { getUserProfile } from "@/services/userService";

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  const refreshProfile = useCallback(async () => {
    if (!auth || !auth.currentUser) {
      console.log("[auth] refreshProfile skipped: no active auth user");
      setAppUser(null);
      return;
    }

    try {
      const profile = await getUserProfile(auth.currentUser.uid);
      setAppUser(profile);
      console.log("[auth] refreshProfile completed", {
        uid: auth.currentUser.uid,
        role: profile?.role,
        status: profile?.status,
      });
    } catch (error) {
      console.error("[auth] refreshProfile failed", error);
      setAppUser(null);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      console.warn("[auth] Firebase Auth is not configured");
      return;
    }

    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) {
        return;
      }

      console.log("[auth] onAuthStateChanged", { uid: nextUser?.uid ?? null });
      setFirebaseUser(nextUser);

      if (!nextUser) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(nextUser.uid);
        if (active) {
          setAppUser(profile);
        }
      } catch (error) {
        console.error("[auth] failed to load profile", error);
        if (active) {
          setAppUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      appUser,
      loading,
      refreshProfile,
    }),
    [firebaseUser, appUser, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}
