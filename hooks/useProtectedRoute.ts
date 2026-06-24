"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { UserRole } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

export function useProtectedRoute(options: {
  allowedRoles: UserRole[];
  requireApprovedNurse?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
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

    // Hard-gate users without a phone number through the phone-required
    // interstitial. Applies universally — patients, nurses, and admins
    // — so every authenticated user has a phone before they can reach
    // a protected surface. Admins included because they need a phone
    // on file for ops/escalation. The /auth/phone-required page itself
    // is exempt to avoid a redirect loop.
    if (!appUser.phone && !pathname?.endsWith("/auth/phone-required")) {
      console.log("[route-guard] blocked: missing phone number");
      router.replace("/auth/phone-required");
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
    pathname,
    router,
  ]);

  return {
    loading,
    appUser,
    firebaseUser,
  };
}
