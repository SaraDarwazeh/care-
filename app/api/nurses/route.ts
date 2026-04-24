import { NextResponse } from "next/server";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getServerDb } from "@/lib/firebase/server";

export async function GET() {
  try {
    const serverDb = getServerDb();
    const usersRef = collection(serverDb, "users");
    const q = query(usersRef, where("role", "==", "nurse"));
    const snapshot = await getDocs(q);

    const nurses = snapshot.docs
      .map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as Array<{ id: string; createdAt?: string }>;

    const sortedNurses = nurses
      .sort((a, b) => {
        const first = String(a.createdAt ?? "");
        const second = String(b.createdAt ?? "");
        return second.localeCompare(first);
      });

    console.log("[api/nurses] fetched nurses", { count: sortedNurses.length });

    return NextResponse.json({ nurses: sortedNurses }, { status: 200 });
  } catch (error) {
    const errorPayload =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : { message: "Unknown error" };

    console.error("[api/nurses] Failed to fetch nurses", errorPayload);

    return NextResponse.json(
      {
        message: "Failed to fetch nurses.",
        details: errorPayload.message,
      },
      { status: 500 },
    );
  }
}
