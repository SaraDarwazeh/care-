import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { authErrorResponse, requireRole } from "@/lib/auth/verifyRequest";

// Re-implement the patient-profile completion check on the server. We
// can't import the client-side helper here (different Firebase SDK), so
// the rule lives in two places — keep them in sync.
function isPresentStr(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
function isPatientProfileCompletedServer(
  profile: Record<string, unknown>,
  newStatus: "verified" | "rejected",
): boolean {
  if (!isPresentStr(profile.phone)) return false;
  if (!isPresentStr(profile.defaultLocation)) return false;
  const ec = profile.emergencyContact as Record<string, unknown> | undefined;
  if (!isPresentStr(ec?.name) || !isPresentStr(ec?.phone)) return false;
  return newStatus === "verified";
}

// Admin reviews a patient's uploaded ID document. PATCH with:
//   { patientId, status: "verified" | "rejected", note?: string }
// Writes verificationStatus + verifiedAt + verifiedBy + verificationNote
// on patientProfiles/{patientId}; emits a notification to the patient.

export async function PATCH(request: NextRequest) {
  let admin;
  try {
    admin = await requireRole(request, ["admin"]);
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = (await request.json().catch(() => ({}))) as {
    patientId?: string;
    status?: string;
    note?: string;
  };

  if (!body.patientId || (body.status !== "verified" && body.status !== "rejected")) {
    return NextResponse.json(
      { error: "patientId and status (verified|rejected) are required" },
      { status: 400 },
    );
  }
  if (body.status === "rejected" && !body.note?.trim()) {
    return NextResponse.json(
      { error: "A note is required when rejecting an ID" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const ref = db.collection("patientProfiles").doc(body.patientId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
  }

  const existing = snap.data() as Record<string, unknown>;
  const profileCompleted = isPatientProfileCompletedServer(existing, body.status);

  await ref.update({
    verificationStatus: body.status,
    verifiedAt: new Date().toISOString(),
    verifiedBy: admin.uid,
    verificationNote: body.note?.trim() || null,
    profileCompleted,
  });

  try {
    const verified = body.status === "verified";
    await db.collection("notifications").add({
      userId: body.patientId,
      type: verified ? "patient_id_verified" : "patient_id_rejected",
      title: verified ? "Identity verified" : "Identity verification needs attention",
      body: verified
        ? "Your identity document was approved. You can now book a nurse."
        : `Your identity document was not approved. ${body.note?.trim() ?? ""}`.trim(),
      link: "/patient/profile",
      payload: { status: body.status, note: body.note ?? null },
      read: false,
      createdAt: new Date().toISOString(),
      deliveredVia: ["in_app"],
    });
  } catch (err) {
    console.warn("[api/patients/verify] notification write failed", err);
  }

  return NextResponse.json({ ok: true });
}
