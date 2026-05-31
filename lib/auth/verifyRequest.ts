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

// Brand symbol used to identify AuthError instances by duck-typing in
// addition to `instanceof`. The plain `instanceof` check can fail in
// Next.js dev mode when error patching or WASM-SWC symbolication
// substitutes a different Error during the throw (we hit this on a
// machine where the native @next/swc-darwin-x64 binary was missing and
// the WASM fallback crashed during `Error.captureStackTrace`). Using
// `Symbol.for` makes the brand survive even if the module is loaded
// twice with different identities.
const AUTH_ERROR_BRAND = Symbol.for("careplus.AuthError");

export class AuthError extends Error {
  status: number;
  readonly [AUTH_ERROR_BRAND] = true;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isAuthError(value: unknown): value is AuthError {
  if (value instanceof AuthError) return true;
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<symbol, unknown>)[AUTH_ERROR_BRAND] === true
  );
}

export function authErrorResponse(error: unknown) {
  if (isAuthError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[verifyRequest] unexpected auth error", error);
  return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
}

async function loadCallerProfile(uid: string): Promise<{ role: UserRole | null; status: string | null }> {
  const db = getAdminDb();
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return { role: null, status: null };
  const data = snap.data() as Record<string, unknown>;
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

  const profile = await loadCallerProfile(decoded.uid);

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
