import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { authErrorResponse, requireRole } from "@/lib/auth/verifyRequest";

export async function PATCH(request: NextRequest) {
  try {
    await requireRole(request, ["admin"]);
  } catch (error) {
    return authErrorResponse(error);
  }

  try {
    const body = (await request.json()) as { id?: string; status?: string };

    if (!body.id || !body.status) {
      return NextResponse.json(
        { message: "id and status are required." },
        { status: 400 },
      );
    }

    if (!["approved", "rejected"].includes(body.status)) {
      return NextResponse.json(
        { message: "Status must be approved or rejected." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const userRef = db.collection("users").doc(body.id);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const userData = userSnapshot.data() as Record<string, unknown> | undefined;
    if (userData?.role !== "nurse") {
      return NextResponse.json(
        { message: "Target user is not a nurse." },
        { status: 400 },
      );
    }

    await userRef.update({ status: body.status });

    console.log("[api/nurses/status] nurse status updated", {
      id: body.id,
      status: body.status,
    });

    // Notify the nurse server-side using the admin SDK. We write directly
    // here instead of calling notificationService (which is client-only).
    try {
      const approved = body.status === "approved";
      await db.collection("notifications").add({
        userId: body.id,
        type: approved ? "nurse_approved" : "nurse_rejected",
        title: approved ? "Profile approved" : "Profile not approved",
        body: approved
          ? "Your profile has been approved. You can now receive bookings."
          : "Your profile was not approved at this time. Please contact support for next steps.",
        link: approved ? "/nurse" : "/pending-approval",
        payload: { newStatus: body.status },
        read: false,
        createdAt: new Date().toISOString(),
        deliveredVia: ["in_app"],
      });
    } catch (notifyError) {
      // Notification is best-effort — never fail the parent operation.
      console.warn("[api/nurses/status] notification write failed", notifyError);
    }

    return NextResponse.json({ message: "Nurse updated successfully." }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/nurses/status] Failed to update nurse status", error);

    return NextResponse.json(
      { message: "Failed to update nurse status.", details: message },
      { status: 500 },
    );
  }
}
