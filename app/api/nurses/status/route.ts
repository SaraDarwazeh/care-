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
