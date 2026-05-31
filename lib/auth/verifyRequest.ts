import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, isAdminSdkConfigured } from "@/lib/firebase/admin";
import type { UserRole } from "@/lib/types";

export interface AuthenticatedCaller {
  uid: string;
  email: string | null;
  role: UserRole | null;
  status: string | null;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  // TEMP TRACE — surface the underlying error class + stack so we can
  // tell apart Firestore SDK errors, admin init failures, network etc.
  console.error("[verifyRequest][TRACE] unexpected auth error", {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    code: (error as { code?: unknown })?.code,
    stack: error instanceof Error ? error.stack : undefined,
  });
  return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
}

// Returns just enough UID to identify the doc lookup in logs without
// leaking the full Firebase Auth UID. First 6 + last 2 chars.
function maskUid(uid: string): string {
  if (uid.length <= 8) return uid;
  return `${uid.slice(0, 6)}…${uid.slice(-2)}`;
}

async function loadCallerProfile(uid: string): Promise<{ role: UserRole | null; status: string | null }> {
  const db = getAdminDb();
  // TEMP TRACE — wrap the Firestore read so the actual exception shows
  // up here labelled, instead of escaping as a generic Error that
  // authErrorResponse renders as "Authentication failed".
  let snap;
  try {
    snap = await db.collection("users").doc(uid).get();
  } catch (error) {
    console.error("[verifyRequest][TRACE] loadCallerProfile Firestore read threw", {
      uid: maskUid(uid),
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      code: (error as { code?: unknown })?.code,
    });
    throw error;
  }
  if (!snap.exists) {
    console.warn("[verifyRequest][TRACE] users/{uid} document does NOT exist", {
      uid: maskUid(uid),
    });
    return { role: null, status: null };
  }
  const data = snap.data() as Record<string, unknown>;
  console.info("[verifyRequest][TRACE] users/{uid} loaded", {
    uid: maskUid(uid),
    role: data.role ?? null,
    status: data.status ?? null,
  });
  return {
    role: (data.role as UserRole) ?? null,
    status: (data.status as string) ?? null,
  };
}

export async function verifyRequest(request: NextRequest): Promise<AuthenticatedCaller> {
  if (!isAdminSdkConfigured()) {
    throw new AuthError(
      503,
      "Server auth is not configured. Add Firebase Admin credentials to environment.",
    );
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AuthError(401, "Missing bearer token");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new AuthError(401, "Empty bearer token");
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch (error) {
    console.warn("[verifyRequest] token verification failed", error);
    throw new AuthError(401, "Invalid or expired token");
  }

  // TEMP TRACE — confirm which authenticated user reached the request.
  console.info("[verifyRequest][TRACE] token verified", {
    uid: maskUid(decoded.uid),
    email: decoded.email ?? null,
  });

  const profile = await loadCallerProfile(decoded.uid);

  // TEMP TRACE — final resolution before requireRole sees it.
  console.info("[verifyRequest][TRACE] resolved caller", {
    uid: maskUid(decoded.uid),
    role: profile.role,
    status: profile.status,
  });

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    role: profile.role,
    status: profile.status,
  };
}

export async function requireRole(
  request: NextRequest,
  allowed: UserRole[],
): Promise<AuthenticatedCaller> {
  const caller = await verifyRequest(request);
  if (!caller.role || !allowed.includes(caller.role)) {
    throw new AuthError(403, "Insufficient privileges");
  }
  return caller;
}
