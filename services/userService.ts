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
import { AppUser, ProviderKind, UserConsent, UserRole, UserStatus } from "@/lib/types";
import { notifyNurseSignup } from "@/services/notificationService";

function mapDocToUser(
  userDoc: Record<string, unknown> & {
    id: string;
  },
): AppUser {
  const lang = userDoc.language;
  const provider = userDoc.provider;
  return {
    id: userDoc.id,
    name: String(userDoc.name ?? ""),
    email: String(userDoc.email ?? ""),
    role: userDoc.role as UserRole,
    providerKind:
      userDoc.providerKind === "physio" || userDoc.providerKind === "nurse"
        ? (userDoc.providerKind as ProviderKind)
        : undefined,
    status: (userDoc.status as UserStatus) ?? "approved",
    createdAt: String(userDoc.createdAt ?? ""),
    language: lang === "en" || lang === "ar" ? lang : undefined,
    provider: provider === "google" ? "google" : "email",
    approvedAt: typeof userDoc.approvedAt === "string" ? userDoc.approvedAt : undefined,
    lastApprovedProfileHash:
      typeof userDoc.lastApprovedProfileHash === "string"
        ? userDoc.lastApprovedProfileHash
        : undefined,
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

// Update the user's display name everywhere it's stored. Writes:
//   1. users/{uid}.name — source of truth read by useAuth, the admin
//      list, marketplace fallback, etc.
//   2. Firebase Auth displayName — keeps the auth token's name claim
//      consistent for any future server-side use. Best-effort; if the
//      auth update fails we still persist the Firestore name so the UI
//      reflects the change.
export async function updateUserDisplayName(
  id: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty.");
  const { db, auth } = ensureClientFirebase();
  await updateDoc(doc(db, "users", id), { name: trimmed });
  if (auth.currentUser && auth.currentUser.uid === id) {
    try {
      const { updateProfile } = await import("firebase/auth");
      await updateProfile(auth.currentUser, { displayName: trimmed });
    } catch (error) {
      // Auth-side update is non-fatal; the Firestore copy is what UI reads.
      console.warn("[userService] updateProfile(auth) failed", error);
    }
  }
}

export async function createUserProfile(input: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneCountry?: "PS" | "IL";
  role: Exclude<UserRole, "admin">;
  // When role is "nurse", optionally specifies whether this provider
  // is a nurse or a physiotherapist. Both go through the same nurse
  // infrastructure (collection, routes, approval flow) — providerKind
  // is the discriminator. Defaults to "nurse" when omitted.
  providerKind?: ProviderKind;
  consent?: UserConsent;
  provider?: "email" | "google";
}) {
  const { db } = ensureClientFirebase();
  const status: UserStatus = input.role === "nurse" ? "pending" : "approved";

  console.log("[userService] createUserProfile", {
    id: input.id,
    role: input.role,
    status,
    provider: input.provider ?? "email",
  });

  // Stamp providerKind on nurse-role records so the post-signup setup
  // form knows which kind to onboard. Patients and admins never carry
  // this field.
  const providerKind: ProviderKind | undefined =
    input.role === "nurse" ? input.providerKind ?? "nurse" : undefined;

  await setDoc(doc(db, "users", input.id), {
    id: input.id,
    name: input.name,
    email: input.email,
    role: input.role,
    status,
    provider: input.provider ?? "email",
    createdAt: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
    // Consent block is optional only for backward compat — the register
    // flow always passes one. Legacy accounts created before consent
    // capture stay readable without this field.
    ...(input.consent ? { consent: input.consent } : {}),
    ...(providerKind ? { providerKind } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.phoneCountry ? { phoneCountry: input.phoneCountry } : {}),
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
