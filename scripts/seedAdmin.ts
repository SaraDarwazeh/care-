/* eslint-disable @typescript-eslint/no-explicit-any */
// CLI helper: promote an existing Firebase Auth user to admin.
//
// Usage:
//   1. The target user must already be registered (any role, e.g. via /register).
//   2. Find their UID in Firebase Auth (firebase-admin can list them — see below).
//   3. Run:
//        npx tsx scripts/seedAdmin.ts <uid> [name] [email]
//      Or set ADMIN_EMAIL and we'll look up the UID for you.
//
// Required env (from .env.local):
//   - ADMIN_SEED_SECRET (must match the API endpoint's secret)
//   - FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,
//     FIREBASE_ADMIN_PRIVATE_KEY (for looking up users by email)
//   - SEED_ENDPOINT (defaults to http://localhost:3000/api/admin/seed)

import fs from "fs";
import path from "path";

// --- minimal .env.local loader -----------------------------------------------

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("[seedAdmin] No .env.local found — relying on process.env.");
    return;
  }
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const eq = line.indexOf("=");
    if (eq < 0) return;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
}

// --- helpers ----------------------------------------------------------------

async function lookupUidByEmail(email: string): Promise<{ uid: string; name?: string }> {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      "FIREBASE_ADMIN_* env vars not set. Cannot lookup user by email. Pass UID directly instead.",
    );
  }
  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  const adminMod = await import("firebase-admin");
  const admin = (adminMod as any).default ?? adminMod;
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
  const user = await admin.auth().getUserByEmail(email);
  return { uid: user.uid, name: user.displayName ?? undefined };
}

// --- main ------------------------------------------------------------------

async function main() {
  loadEnvLocal();

  const args = process.argv.slice(2);
  let uid = args[0];
  let name = args[1];
  const email = args[2] ?? process.env.ADMIN_EMAIL;

  if (!uid && email) {
    console.log(`[seedAdmin] Looking up UID for ${email}...`);
    const lookup = await lookupUidByEmail(email);
    uid = lookup.uid;
    name = name ?? lookup.name;
  }

  if (!uid) {
    console.error(
      "Usage: npx tsx scripts/seedAdmin.ts <uid> [name] [email]\n" +
        "  or set ADMIN_EMAIL in .env.local and run without args.",
    );
    process.exit(1);
  }

  const secret = process.env.ADMIN_SEED_SECRET;
  if (!secret) {
    console.error("ADMIN_SEED_SECRET is not set. Cannot seed admin.");
    process.exit(1);
  }
  if (secret === "change-me") {
    console.error(
      "ADMIN_SEED_SECRET is still the placeholder 'change-me'. Set a real secret first.",
    );
    process.exit(1);
  }

  const endpoint = process.env.SEED_ENDPOINT ?? "http://localhost:3000/api/admin/seed";
  console.log(`[seedAdmin] POST ${endpoint} (uid=${uid})`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: uid,
      name: name ?? "Care Plus Admin",
      email: email ?? "",
      seedSecret: secret,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`[seedAdmin] FAILED (${response.status}): ${body}`);
    process.exit(1);
  }
  console.log(`[seedAdmin] OK: ${body}`);
}

main().catch((err) => {
  console.error("[seedAdmin] crashed:", err);
  process.exit(1);
});
