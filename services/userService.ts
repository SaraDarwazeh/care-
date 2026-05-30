import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { AppUser, UserConsent, UserRole, UserStatus } from "@/lib/types";
import { notifyNurseSignup } from "@/services/notificationService";

function mapDocToUser(
  userDoc: Record<string, unknown> & {
    id: string;
  },
): AppUser {
  const lang = userDoc.language;
  return {
    id: userDoc.id,
    name: String(userDoc.name ?? ""),
    email: String(userDoc.email ?? ""),
    role: userDoc.role as UserRole,
    status: (userDoc.status as UserStatus) ?? "approved",
    createdAt: String(userDoc.createdAt ?? ""),
    language: lang === "en" || lang === "ar" ? lang : undefined,
  };
}

// Persisted via LocaleSwitcher when the user toggles. Best-effort:
// failure is swallowed at the call site because the cookie alone is
// sufficient for the next request on the current device.
export async function updateUserLanguage(
  id: string,
  language: "en" | "ar",
): Promise<void> {
  const { db } = ensureClientFirebase();
  await updateDoc(doc(db, "users", id), { language });
}

export async function createUserProfile(input: {
  id: string;
  name: string;
  email: string;
  role: Exclude<UserRole, "admin">;
  consent?: UserConsent;
}) {
  const { db } = ensureClientFirebase();
  const status: UserStatus = input.role === "nurse" ? "pending" : "approved";

  console.log("[userService] createUserProfile", {
    id: input.id,
    role: input.role,
    status,
  });

  await setDoc(doc(db, "users", input.id), {
    id: input.id,
    name: input.name,
    email: input.email,
    role: input.role,
    status,
    createdAt: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
    // Consent block is optional only for backward compat — the register
    // flow always passes one. Legacy accounts created before consent
    // capture stay readable without this field.
    ...(input.consent ? { consent: input.consent } : {}),
  });

  if (input.role === "nurse") {
    await notifyNurseSignup({ nurseUserId: input.id, nurseName: input.name });
  }
}

export async function getUserProfile(id: string): Promise<AppUser | null> {
  const { db } = ensureClientFirebase();
  const userRef = doc(db, "users", id);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    console.warn("[userService] user profile not found", { id });
    return null;
  }

  const raw = snapshot.data() as Record<string, unknown>;
  return mapDocToUser({ id: snapshot.id, ...raw });
}

export async function updateNurseStatus(id: string, status: "approved" | "rejected") {
  const { db } = ensureClientFirebase();
  const userRef = doc(db, "users", id);
  console.log("[userService] updateNurseStatus", { id, status });
  await updateDoc(userRef, { status });
}

export async function getNurses() {
  const { db } = ensureClientFirebase();
  const usersRef = collection(db, "users");
  const nursesQuery = query(
    usersRef,
    where("role", "==", "nurse"),
    orderBy("createdAt", "desc"),
  );
  const snapshots = await getDocs(nursesQuery);

  return snapshots.docs.map((item) => {
    const data = item.data() as Record<string, unknown>;
    return mapDocToUser({ id: item.id, ...data });
  });
}
