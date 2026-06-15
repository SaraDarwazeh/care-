import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { UserConsent, UserRole } from "@/lib/types";
import { createUserProfile, getUserProfile } from "@/services/userService";

export async function registerWithEmail(input: {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "admin">;
  consent: UserConsent;
}) {
  const { auth } = ensureClientFirebase();

  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);

  try {
    await createUserProfile({
      id: credential.user.uid,
      name: input.name,
      email: input.email,
      role: input.role,
      consent: input.consent,
    });

    console.log("[authService] user registered with profile", {
      uid: credential.user.uid,
      role: input.role,
    });

    return credential.user;
  } catch (error) {
    console.error("[authService] failed to create user profile, rolling back auth user", error);

    await deleteUser(credential.user);
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string) {
  const { auth } = ensureClientFirebase();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// Sign in with a Google popup. Returns one of three outcomes:
//   - { needsRole: false }            — user already exists in Firestore; sign-in is complete.
//   - { needsRole: true, ... }        — first-time Google sign-in; caller should send the
//                                       user to /auth/google-role to pick a role + accept consent.
//   - { collision: true, email }      — the email is already registered with a different
//                                       sign-in method (typically email/password). The popup
//                                       throws `auth/account-exists-with-different-credential`;
//                                       we catch it, sign out the Firebase session so we
//                                       don't leave a half-authed user around, and let the
//                                       caller render a helpful error.
//
// Requires: Google sign-in provider enabled in the Firebase Console and
// "One account per email" enabled in Authentication → Settings (the
// default). Without that, the popup silently creates a second Firebase
// Auth user for the same email and the collision branch never fires.
export async function signInWithGoogle(): Promise<
  | { needsRole: true; uid: string; name: string; email: string }
  | { needsRole: false }
  | { collision: true; email: string }
> {
  const { auth } = ensureClientFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  let credential;
  try {
    credential = await signInWithPopup(auth, provider);
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "";
    if (code === "auth/account-exists-with-different-credential") {
      const conflictingEmail =
        (error as { customData?: { email?: string } })?.customData?.email ?? "";
      // Sign-in didn't complete, but defensively clear any partial state
      // so the next attempt starts from a clean session.
      try {
        await signOut(auth);
      } catch {
        // Best-effort cleanup; the popup error itself is the signal.
      }
      return { collision: true, email: conflictingEmail };
    }
    throw error;
  }

  const fbUser = credential.user;

  const existing = await getUserProfile(fbUser.uid);
  if (existing) {
    return { needsRole: false };
  }

  return {
    needsRole: true,
    uid: fbUser.uid,
    name: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "",
    email: fbUser.email ?? "",
  };
}

// Finishes a Google signup by writing the users/{uid} doc with the role
// the user picked in the interstitial. Mirrors the email-password path.
export async function completeGoogleSignup(input: {
  uid: string;
  name: string;
  email: string;
  role: Exclude<UserRole, "admin">;
  consent: UserConsent;
}) {
  await createUserProfile({
    id: input.uid,
    name: input.name,
    email: input.email,
    role: input.role,
    consent: input.consent,
    provider: "google",
  });
}

export async function logoutUser() {
  const { auth } = ensureClientFirebase();
  await signOut(auth);
  document.cookie = "careplus_session=; path=/; max-age=0; SameSite=Lax";
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const { auth } = ensureClientFirebase();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error("[authService] failed to fetch ID token", error);
    return null;
  }
}

export async function resetPassword(email: string) {
  const { auth } = ensureClientFirebase();
  await sendPasswordResetEmail(auth, email);
}
