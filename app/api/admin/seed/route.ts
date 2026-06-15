import { NextResponse } from "next/server";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getServerDb } from "@/lib/firebase/server";

// First-admin bootstrap. By design this exists because the very first
// admin can't be created via the normal admin-protected routes — there's
// no admin yet. To keep this safe in production we require BOTH:
//   1. NODE_ENV !== "production" OR an explicit ALLOW_ADMIN_SEED=true
//      deploy-time flag (so a leaked secret alone isn't enough), AND
//   2. The shared ADMIN_SEED_SECRET, AND
//   3. The target doc doesn't already exist (this is a no-op for an
//      already-seeded admin).
// Once your prod admin is seeded, set ALLOW_ADMIN_SEED=false (or unset)
// and rotate ADMIN_SEED_SECRET so the route is effectively offline.
export async function POST(request: Request) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const explicitlyAllowed = process.env.ALLOW_ADMIN_SEED === "true";
    if (isProduction && !explicitlyAllowed) {
      return NextResponse.json(
        { message: "Admin seeding is disabled in production. Set ALLOW_ADMIN_SEED=true on a one-time deploy to enable." },
        { status: 403 },
      );
    }

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
