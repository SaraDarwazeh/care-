/**
 * One-off migration script — runs after the onboarding state machine
 * lands (commit b544d18).
 *
 * The new UserStatus union splits the old "pending" value into:
 *   - "incomplete"     — nurse registered but never filled the profile
 *   - "pending_review" — nurse submitted the profile, awaiting admin review
 *
 * This script scans every users/{uid} doc with role === "nurse" and
 * status === "pending" and assigns the new value based on profile
 * completeness:
 *
 *   nurseProfiles/{uid} exists AND has fullName + bio + specialization
 *   + at least one service + at least one available day
 *      → "pending_review"
 *   otherwise
 *      → "incomplete"
 *
 * It also normalises any patient docs accidentally left at "pending"
 * (patients don't need approval) to "approved".
 *
 * Idempotent: re-running it after the first pass is a no-op.
 *
 * Usage (via tsx in this repo):
 *   tsx scripts/migrateNurseStatuses.ts                 # apply
 *   tsx scripts/migrateNurseStatuses.ts --dry-run       # report only
 *
 * Requires the same NEXT_PUBLIC_FIREBASE_* env vars as the app.
 */

import { initializeApp, getApps } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";

interface MigrationStats {
  scannedNurses: number;
  toIncomplete: number;
  toPendingReview: number;
  patientsNormalised: number;
  skipped: number;
}

function profileLooksComplete(p: Record<string, unknown> | null): boolean {
  if (!p) return false;
  const fullName = typeof p.fullName === "string" && p.fullName.trim().length > 0;
  const bio = typeof p.bio === "string" && p.bio.trim().length > 0;
  const specialization =
    typeof p.specialization === "string" && p.specialization.trim().length > 0;
  const services = Array.isArray(p.services) && p.services.length > 0;
  const days = Array.isArray(p.availableDays) && p.availableDays.length > 0;
  return fullName && bio && specialization && services && days;
}

async function migrate(db: Firestore, dryRun: boolean): Promise<MigrationStats> {
  const stats: MigrationStats = {
    scannedNurses: 0,
    toIncomplete: 0,
    toPendingReview: 0,
    patientsNormalised: 0,
    skipped: 0,
  };

  // Pull all nurse users.
  const nurseUsers = await getDocs(
    query(collection(db, "users"), where("role", "==", "nurse")),
  );
  for (const userDoc of nurseUsers.docs) {
    const data = userDoc.data() as Record<string, unknown>;
    const status = data.status as string;
    if (status !== "pending") {
      stats.skipped++;
      continue;
    }
    stats.scannedNurses++;
    const profileSnap = await getDoc(doc(db, "nurseProfiles", userDoc.id));
    const profile = profileSnap.exists()
      ? (profileSnap.data() as Record<string, unknown>)
      : null;
    const next = profileLooksComplete(profile) ? "pending_review" : "incomplete";
    if (next === "pending_review") stats.toPendingReview++;
    else stats.toIncomplete++;
    console.log(`  ${userDoc.id}: pending → ${next}`);
    if (!dryRun) {
      await setDoc(doc(db, "users", userDoc.id), { status: next }, { merge: true });
    }
  }

  // Normalise patient docs accidentally left at pending.
  const patientUsers = await getDocs(
    query(collection(db, "users"), where("role", "==", "patient")),
  );
  for (const userDoc of patientUsers.docs) {
    const data = userDoc.data() as Record<string, unknown>;
    if (data.status === "pending") {
      stats.patientsNormalised++;
      console.log(`  patient ${userDoc.id}: pending → approved`);
      if (!dryRun) {
        await setDoc(doc(db, "users", userDoc.id), { status: "approved" }, { merge: true });
      }
    }
  }

  return stats;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!firebaseConfig.projectId) {
    console.error(
      "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID. Run with .env.local loaded — e.g. `dotenv -e .env.local tsx scripts/migrateNurseStatuses.ts`.",
    );
    process.exit(1);
  }

  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log(
    dryRun
      ? "🟡 Dry run — no writes will be performed."
      : "🟢 Live run — writes will be applied.",
  );
  const stats = await migrate(db, dryRun);
  console.log("\nResult:");
  console.log(`  scanned (pending nurses):  ${stats.scannedNurses}`);
  console.log(`  → incomplete:              ${stats.toIncomplete}`);
  console.log(`  → pending_review:          ${stats.toPendingReview}`);
  console.log(`  patients normalised:       ${stats.patientsNormalised}`);
  console.log(`  skipped (non-pending):     ${stats.skipped}`);
}

main().catch((err) => {
  console.error("migration failed:", err);
  process.exit(1);
});
