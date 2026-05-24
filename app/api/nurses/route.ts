import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { authErrorResponse, requireRole } from "@/lib/auth/verifyRequest";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ["admin"]);
  } catch (error) {
    return authErrorResponse(error);
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection("users").where("role", "==", "nurse").get();

    const nurses = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    })) as Array<{ id: string; createdAt?: string }>;

    nurses.sort((a, b) => {
      const first = String(a.createdAt ?? "");
      const second = String(b.createdAt ?? "");
      return second.localeCompare(first);
    });

    console.log("[api/nurses] fetched nurses", { count: nurses.length });

    return NextResponse.json({ nurses }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/nurses] Failed to fetch nurses", error);

    return NextResponse.json(
      { message: "Failed to fetch nurses.", details: message },
      { status: 500 },
    );
  }
}
