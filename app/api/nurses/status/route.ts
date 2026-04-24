import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getServerDb } from "@/lib/firebase/server";

export async function PATCH(request: Request) {
  try {
    const serverDb = getServerDb();
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

    const userRef = doc(serverDb, "users", body.id);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    await updateDoc(userRef, { status: body.status });

    console.log("[api/nurses/status] nurse status updated", {
      id: body.id,
      status: body.status,
    });

    return NextResponse.json({ message: "Nurse updated successfully." }, { status: 200 });
  } catch (error) {
    const errorPayload =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : { message: "Unknown error" };

    console.error("[api/nurses/status] Failed to update nurse status", errorPayload);

    return NextResponse.json(
      {
        message: "Failed to update nurse status.",
        details: errorPayload.message,
      },
      { status: 500 },
    );
  }
}
