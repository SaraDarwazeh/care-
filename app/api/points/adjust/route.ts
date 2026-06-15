import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { authErrorResponse, requireRole } from "@/lib/auth/verifyRequest";

// Admin-driven manual adjustment of a patient's loyalty balance.
// PATCH with { patientId, delta, reason }
//   delta > 0 → manual credit (writes "earn" entry with admin_adjust)
//   delta < 0 → manual debit  (writes "redeem" entry, blocks if it would
//                              push the balance negative)
//
// All adjustments are audited as ledger entries with the admin's uid
// in the note field so reviewers can trace who did what.

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `adj_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function PATCH(request: NextRequest) {
  let admin;
  try {
    admin = await requireRole(request, ["admin"]);
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = (await request.json().catch(() => ({}))) as {
    patientId?: string;
    delta?: number;
    reason?: string;
  };

  if (!body.patientId || typeof body.delta !== "number" || body.delta === 0) {
    return NextResponse.json({ error: "patientId and non-zero delta required" }, { status: 400 });
  }
  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "A reason is required for manual adjustments" }, { status: 400 });
  }

  const delta = Math.floor(body.delta);
  const db = getAdminDb();
  const userRef = db.collection("users").doc(body.patientId);
  const txId = uuid();
  const ledgerRef = userRef.collection("pointsLedger").doc(txId);

  try {
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const current = userSnap.exists
        ? Number((userSnap.data() as Record<string, unknown>).pointsBalance ?? 0)
        : 0;
      if (delta < 0 && current + delta < 0) {
        throw new Error("Adjustment would put balance below zero");
      }
      tx.set(ledgerRef, {
        type: delta > 0 ? "earn" : "redeem",
        source: "admin_adjust",
        amount: Math.abs(delta),
        sourceId: txId,
        note: `${body.reason!.trim()} (by ${admin.uid})`,
        createdAt: new Date().toISOString(),
      });
      tx.set(
        userRef,
        { pointsBalance: FieldValue.increment(delta) },
        { merge: true },
      );
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Adjustment failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await db.collection("notifications").add({
      userId: body.patientId,
      type: delta > 0 ? "points_earned" : "points_redeemed",
      title: delta > 0 ? `+${Math.abs(delta)} points credited` : `${Math.abs(delta)} points debited`,
      body: body.reason.trim(),
      link: "/patient/profile",
      payload: { admin_adjust: true, delta },
      read: false,
      createdAt: new Date().toISOString(),
      deliveredVia: ["in_app"],
    });
  } catch (err) {
    console.warn("[api/points/adjust] notification write failed", err);
  }

  return NextResponse.json({ ok: true, txId });
}
