"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

export function useProtectedRoute(options: {
  allowedRoles: UserRole[];
  requireApprovedNurse?: boolean;
}) {
  const router = useRouter();
  const { appUser, firebaseUser, loading } = useAuth();

  const allowedRolesKey = options.allowedRoles.join("|");
  useEffect(() => {
    const allowedRoles = allowedRolesKey.split("|") as UserRole[];

    if (loading) {
      return;
    }

    if (!firebaseUser) {
      console.log("[route-guard] blocked: missing firebase user");
      router.replace("/login");
      return;
    }

    if (!appUser) {
      console.log("[route-guard] blocked: missing firestore profile");
      router.replace("/login");
      return;
    }

    if (!allowedRoles.includes(appUser.role)) {
      console.log("[route-guard] blocked: role mismatch", {
        currentRole: appUser.role,
        allowedRoles,
      });
      router.replace("/");
      return;
    }

    if (
      options.requireApprovedNurse &&
      appUser.role === "nurse" &&
      appUser.status !== "approved"
    ) {
      console.log("[route-guard] blocked: nurse pending approval", {
        status: appUser.status,
      });
      router.replace("/pending-approval");
    }
  }, [
    appUser,
    firebaseUser,
    loading,
    allowedRolesKey,
    options.requireApprovedNurse,
    router,
  ]);

  return {
    loading,
    appUser,
    firebaseUser,
  };
}
