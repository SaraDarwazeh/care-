import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { UserRole } from "@/lib/types";
import { createUserProfile } from "@/services/userService";

export async function registerWithEmail(input: {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "admin">;
}) {
  const { auth } = ensureClientFirebase();

  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);

  try {
    await createUserProfile({
      id: credential.user.uid,
      name: input.name,
      email: input.email,
      role: input.role,
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

export async function logoutUser() {
  const { auth } = ensureClientFirebase();
  await signOut(auth);
}

export async function resetPassword(email: string) {
  const { auth } = ensureClientFirebase();
  await sendPasswordResetEmail(auth, email);
}
