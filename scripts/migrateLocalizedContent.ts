/**
 * One-time backfill script — Phase 5 mandatory launch prerequisite.
 *
 * Converts legacy plain-string fields in three Firestore collections
 * to the canonical LocalizedString shape ({en, ar?}). Idempotent: a
 * second run does nothing because every record already matches the
 * canonical shape.
 *
 * Coverage:
 *   - packages         → title, summary, description, targetAudience,
 *                        recommendedFor[], includedServices[],
 *                        highlights[], outcomes[],
 *                        careTimeline[].title, .description,
 *                        durationOptions[].label
 *   - educationCards   → title, body
 *   - products         → name, description
 *
 * After backfill verifies in production, the tolerant branches in the
 * service mappers can be removed.
 *
 * Usage (via tsx in this repo):
 *   tsx scripts/migrateLocalizedContent.ts                  # apply
 *   tsx scripts/migrateLocalizedContent.ts --dry-run        # report only
 *   tsx scripts/migrateLocalizedContent.ts --only=packages  # subset
 *
 * Requires the same NEXT_PUBLIC_FIREBASE_* env vars as the app.
 */

import { initializeApp, getApps } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  setDoc,
  type Firestore,
} from "firebase/firestore";

interface LocalizedString {
  en: string;
  ar?: string;
}

type LegacyOrLocalized = string | LocalizedString | null | undefined | unknown;

function isLocalized(v: unknown): v is LocalizedString {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { en?: unknown }).en === "string"
  );
}

function wrap(v: LegacyOrLocalized): LocalizedString | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") {
    return v.length > 0 ? { en: v } : undefined;
  }
  if (isLocalized(v)) return v;
  return undefined;
}

function wrapArray(v: unknown): LocalizedString[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: LocalizedString[] = [];
  for (const item of v) {
    const w = wrap(item);
    if (w) out.push(w);
  }
  return out;
}

interface MigrationStats {
  collection: string;
  scanned: number;
  changed: number;
  skipped: number;
  skippedReasons: Record<string, number>;
}

function logStats(s: MigrationStats) {
  console.log(
    `  ${s.collection}: scanned=${s.scanned} changed=${s.changed} skipped=${s.skipped}`,
  );
  for (const [reason, n] of Object.entries(s.skippedReasons)) {
    console.log(`    skipped ${reason}: ${n}`);
  }
}

async function migratePackages(db: Firestore, dryRun: boolean): Promise<MigrationStats> {
  const stats: MigrationStats = {
    collection: "packages",
    scanned: 0,
    changed: 0,
    skipped: 0,
    skippedReasons: {},
  };
  const snap = await getDocs(collection(db, "packages"));
  for (const d of snap.docs) {
    if (d.id === "meta-seed-version") {
      stats.skipped++;
      stats.skippedReasons["meta-doc"] = (stats.skippedReasons["meta-doc"] ?? 0) + 1;
      continue;
    }
    stats.scanned++;
    const data = d.data() as Record<string, unknown>;

    const next: Record<string, unknown> = {};
    let changed = false;
    const fields: Array<keyof typeof data> = [
      "title",
      "summary",
      "description",
      "targetAudience",
    ];
    for (const k of fields) {
      const w = wrap(data[k] as LegacyOrLocalized);
      if (w && typeof data[k] === "string") {
        next[k] = w;
        changed = true;
      }
    }
    const arrayFields = ["recommendedFor", "includedServices", "highlights", "outcomes"];
    for (const k of arrayFields) {
      const arr = data[k];
      if (Array.isArray(arr) && arr.some((it) => typeof it === "string")) {
        next[k] = wrapArray(arr);
        changed = true;
      }
    }
    if (Array.isArray(data.careTimeline)) {
      const steps = (data.careTimeline as unknown[]).map((raw) => {
        if (!raw || typeof raw !== "object") return raw;
        const step = raw as { title?: unknown; description?: unknown };
        const t = wrap(step.title);
        const desc = wrap(step.description);
        if (t || desc) {
          return {
            ...step,
            title: typeof step.title === "string" ? t : step.title,
            description: typeof step.description === "string" ? desc : step.description,
          };
        }
        return step;
      });
      if (JSON.stringify(steps) !== JSON.stringify(data.careTimeline)) {
        next.careTimeline = steps;
        changed = true;
      }
    }
    if (Array.isArray(data.durationOptions)) {
      const opts = (data.durationOptions as unknown[]).map((raw) => {
        if (!raw || typeof raw !== "object") return raw;
        const opt = raw as { label?: unknown };
        if (typeof opt.label === "string") {
          return { ...opt, label: wrap(opt.label) };
        }
        return opt;
      });
      if (JSON.stringify(opts) !== JSON.stringify(data.durationOptions)) {
        next.durationOptions = opts;
        changed = true;
      }
    }

    if (changed) {
      stats.changed++;
      if (!dryRun) {
        await setDoc(doc(db, "packages", d.id), { ...data, ...next, updatedAt: new Date().toISOString() });
      }
      console.log(`  ✔ packages/${d.id}${dryRun ? " (dry-run)" : ""}`);
    } else {
      stats.skipped++;
      stats.skippedReasons["already-canonical"] =
        (stats.skippedReasons["already-canonical"] ?? 0) + 1;
    }
  }
  // Stamp the seed-version meta doc so subsequent reads know the collection
  // has been seeded/migrated and shouldn't auto-seed again.
  if (!dryRun) {
    await setDoc(doc(db, "packages", "meta-seed-version"), {
      version: 1,
      setAt: new Date().toISOString(),
    });
  }
  return stats;
}

async function migrateEducationCards(db: Firestore, dryRun: boolean): Promise<MigrationStats> {
  const stats: MigrationStats = {
    collection: "educationCards",
    scanned: 0,
    changed: 0,
    skipped: 0,
    skippedReasons: {},
  };
  const snap = await getDocs(collection(db, "educationCards"));
  for (const d of snap.docs) {
    if (d.id === "meta-seed-version") {
      stats.skipped++;
      stats.skippedReasons["meta-doc"] = (stats.skippedReasons["meta-doc"] ?? 0) + 1;
      continue;
    }
    stats.scanned++;
    const data = d.data() as Record<string, unknown>;
    const titleW = typeof data.title === "string" ? wrap(data.title) : null;
    const bodyW = typeof data.body === "string" ? wrap(data.body) : null;
    if (titleW || bodyW) {
      stats.changed++;
      const next: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };
      if (titleW) next.title = titleW;
      if (bodyW) next.body = bodyW;
      if (!dryRun) {
        await setDoc(doc(db, "educationCards", d.id), next);
      }
      console.log(`  ✔ educationCards/${d.id}${dryRun ? " (dry-run)" : ""}`);
    } else {
      stats.skipped++;
      stats.skippedReasons["already-canonical"] =
        (stats.skippedReasons["already-canonical"] ?? 0) + 1;
    }
  }
  if (!dryRun) {
    await setDoc(doc(db, "educationCards", "meta-seed-version"), {
      version: 1,
      setAt: new Date().toISOString(),
    });
  }
  return stats;
}

async function migrateProducts(db: Firestore, dryRun: boolean): Promise<MigrationStats> {
  const stats: MigrationStats = {
    collection: "products",
    scanned: 0,
    changed: 0,
    skipped: 0,
    skippedReasons: {},
  };
  const snap = await getDocs(collection(db, "products"));
  for (const d of snap.docs) {
    if (d.id === "meta-seed-version") {
      stats.skipped++;
      stats.skippedReasons["meta-doc"] = (stats.skippedReasons["meta-doc"] ?? 0) + 1;
      continue;
    }
    stats.scanned++;
    const data = d.data() as Record<string, unknown>;
    const nameW = typeof data.name === "string" ? wrap(data.name) : null;
    const descW = typeof data.description === "string" ? wrap(data.description) : null;
    if (nameW || descW) {
      stats.changed++;
      const next: Record<string, unknown> = { ...data };
      if (nameW) next.name = nameW;
      if (descW) next.description = descW;
      if (!dryRun) {
        await setDoc(doc(db, "products", d.id), next);
      }
      console.log(`  ✔ products/${d.id}${dryRun ? " (dry-run)" : ""}`);
    } else {
      stats.skipped++;
      stats.skippedReasons["already-canonical"] =
        (stats.skippedReasons["already-canonical"] ?? 0) + 1;
    }
  }
  if (!dryRun) {
    await setDoc(doc(db, "products", "meta-seed-version"), {
      version: 1,
      setAt: new Date().toISOString(),
    });
  }
  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg?.split("=")[1];

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!Object.values(firebaseConfig).every(Boolean)) {
    console.error("Missing NEXT_PUBLIC_FIREBASE_* env vars. Run from a shell that has .env.local sourced.");
    process.exit(1);
  }
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log(`Migration ${dryRun ? "DRY-RUN" : "APPLY"}${only ? ` (only=${only})` : ""}`);

  const all: MigrationStats[] = [];
  if (!only || only === "packages") all.push(await migratePackages(db, dryRun));
  if (!only || only === "educationCards") all.push(await migrateEducationCards(db, dryRun));
  if (!only || only === "products") all.push(await migrateProducts(db, dryRun));

  console.log("\nSummary:");
  for (const s of all) logStats(s);

  const totalChanged = all.reduce((sum, s) => sum + s.changed, 0);
  if (dryRun) {
    console.log(`\nDry run complete. ${totalChanged} document(s) would be updated.`);
  } else {
    console.log(`\nMigration complete. ${totalChanged} document(s) updated.`);
  }
}

void main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
