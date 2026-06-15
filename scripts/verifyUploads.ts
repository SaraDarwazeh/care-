/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * One-shot media/upload verification script.
 *
 * Walks every upload scope wired to /api/uploads/presign:
 *   community, nurse-profile, nurse-gallery, nurse-certificate,
 *   package, product.
 *
 * For each scope: presign → PUT test bytes to S3 → HEAD public URL.
 * Prints a pass/fail table at the end.
 *
 * Requirements:
 *   - Dev server running on http://localhost:3000
 *   - Firebase Admin env in .env.local
 *   - At least one admin user (role: "admin") and one nurse user
 *     (role: "nurse", status: "approved") in the users collection.
 *
 * Run: npx tsx scripts/verifyUploads.ts
 */

import fs from "fs";
import path from "path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
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

interface UploadResult {
  scope: string;
  asRole: string;
  presignStatus: number;
  putStatus?: number;
  headStatus?: number;
  publicUrl?: string;
  error?: string;
}

const BASE = "http://localhost:3000";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function ensureAdminApp() {
  const adminMod = await import("firebase-admin");
  const admin = (adminMod as any).default ?? adminMod;
  if (!admin.apps.length) {
    const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").includes("\\n")
      ? process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n")
      : process.env.FIREBASE_ADMIN_PRIVATE_KEY!;
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
  return admin;
}

async function getIdTokenFor(uid: string): Promise<string> {
  const admin = await ensureAdminApp();
  const customToken = await admin.auth().createCustomToken(uid);
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY missing");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`signInWithCustomToken failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.idToken as string;
}

async function findUserByRole(role: "admin" | "nurse" | "patient"): Promise<{ uid: string; name: string } | null> {
  const admin = await ensureAdminApp();
  const db = admin.firestore();
  const snap = await db
    .collection("users")
    .where("role", "==", role)
    .where("status", "==", "approved")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  return { uid: doc.id, name: data.name ?? "" };
}

async function attemptUpload(
  scope: string,
  token: string,
  asRole: string,
): Promise<UploadResult> {
  const presignRes = await fetch(`${BASE}/api/uploads/presign`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: `verify-${scope}.png`,
      contentType: "image/png",
      size: TINY_PNG.length,
      scope,
    }),
  });

  const result: UploadResult = { scope, asRole, presignStatus: presignRes.status };

  if (!presignRes.ok) {
    const body = await presignRes.text().catch(() => "");
    result.error = `presign body: ${body.slice(0, 200)}`;
    return result;
  }

  const presign = await presignRes.json();
  result.publicUrl = presign.publicUrl;

  const putRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: TINY_PNG,
  });
  result.putStatus = putRes.status;
  if (!putRes.ok) {
    const body = await putRes.text().catch(() => "");
    result.error = `PUT body: ${body.slice(0, 200)}`;
    return result;
  }

  const headRes = await fetch(presign.publicUrl, { method: "HEAD" });
  result.headStatus = headRes.status;
  if (!headRes.ok) {
    result.error = `HEAD returned ${headRes.status} — bucket may be private or policy missing`;
  }
  return result;
}

async function main() {
  loadEnvLocal();

  console.log("[verify] Looking up users…");
  const admin = await findUserByRole("admin");
  const nurse = await findUserByRole("nurse");

  if (!admin) {
    console.error(
      "[verify] No approved admin user found in Firestore. Run scripts/seedAdmin.ts first.",
    );
  }
  if (!nurse) {
    console.error(
      "[verify] No approved nurse user found in Firestore. Run scripts/seedData.ts first.",
    );
  }
  if (!admin && !nurse) process.exit(1);

  const results: UploadResult[] = [];

  if (nurse) {
    console.log(`[verify] Acting as NURSE ${nurse.name} (${nurse.uid})`);
    const nurseToken = await getIdTokenFor(nurse.uid);

    for (const scope of ["community", "nurse-profile", "nurse-gallery", "nurse-certificate"]) {
      console.log(`  - ${scope}`);
      results.push(await attemptUpload(scope, nurseToken, "nurse"));
    }

    // Negative test: nurse trying to upload to package scope (should 403)
    console.log("  - package (expect 403 as nurse)");
    results.push(await attemptUpload("package", nurseToken, "nurse"));
  }

  if (admin) {
    console.log(`[verify] Acting as ADMIN ${admin.name} (${admin.uid})`);
    const adminToken = await getIdTokenFor(admin.uid);
    for (const scope of ["package", "product", "community"]) {
      console.log(`  - ${scope}`);
      results.push(await attemptUpload(scope, adminToken, "admin"));
    }
  }

  // Print final report
  console.log("\n=== RESULTS ===");
  for (const r of results) {
    const summary = [
      r.scope.padEnd(20),
      `as=${r.asRole.padEnd(6)}`,
      `presign=${r.presignStatus}`,
      r.putStatus !== undefined ? `put=${r.putStatus}` : "",
      r.headStatus !== undefined ? `head=${r.headStatus}` : "",
    ].join(" ");
    if (r.error) {
      console.log(`FAIL ${summary} :: ${r.error}`);
    } else {
      console.log(`OK   ${summary} :: ${r.publicUrl}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
