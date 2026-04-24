import { NextResponse } from "next/server";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getServerDb } from "@/lib/firebase/server";

export async function POST(request: Request) {
  try {
    const serverDb = getServerDb();
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      email?: string;
      seedSecret?: string;
    };

    if (!body.id || !body.name || !body.email) {
      return NextResponse.json(
        { message: "id, name, and email are required." },
        { status: 400 },
      );
    }

    if (!process.env.ADMIN_SEED_SECRET || body.seedSecret !== process.env.ADMIN_SEED_SECRET) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const userRef = doc(serverDb, "users", body.id);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      return NextResponse.json({ message: "Admin user already exists." }, { status: 200 });
    }

    await setDoc(userRef, {
      id: body.id,
      name: body.name,
      email: body.email,
      role: "admin",
      status: "approved",
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });

    return NextResponse.json({ message: "Admin user seeded." }, { status: 201 });
  } catch (error) {
    console.error("Failed to seed admin user", error);
    return NextResponse.json({ message: "Failed to seed admin user." }, { status: 500 });
  }
}
