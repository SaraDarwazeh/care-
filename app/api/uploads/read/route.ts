import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, verifyRequest, AuthError } from "@/lib/auth/verifyRequest";
import { getSignedReadUrl } from "@/lib/aws/s3";

// Proxy that mints a short-lived signed GET URL for objects in private
// S3 prefixes. Public prefixes (community/*, products/*, etc.) don't go
// through here — clients read those directly via buildPublicUrl().
//
// Authz:
//   - admin           → any key
//   - patient (owner) → only keys under patients/ids/{their-uid}/
//   - everyone else   → 403
//
// Patient-id keys carry the patient's uid as the second segment, so we
// can decide owner authz from the key alone with no Firestore lookup.

const SIGNED_READ_TTL_SECONDS = 60 * 5;

function isPatientIdKey(key: string): boolean {
  return key.startsWith("patients/ids/");
}

function patientIdKeyOwner(key: string): string | null {
  const parts = key.split("/");
  if (parts.length < 4 || parts[0] !== "patients" || parts[1] !== "ids") return null;
  return parts[2] || null;
}

export async function GET(request: NextRequest) {
  let caller;
  try {
    caller = await verifyRequest(request);
  } catch (error) {
    return authErrorResponse(error);
  }

  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key query parameter is required" }, { status: 400 });
  }
  if (key.includes("..") || key.startsWith("/")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    if (caller.role === "admin") {
      // OK — admins can read any object.
    } else if (isPatientIdKey(key)) {
      const owner = patientIdKeyOwner(key);
      if (!owner) throw new AuthError(400, "Malformed patient-id key");
      if (caller.role !== "patient" || owner !== caller.uid) {
        throw new AuthError(403, "Not authorized to read this object");
      }
    } else {
      // No other private prefix is wired yet. Refuse signed reads for
      // anything we don't explicitly own.
      throw new AuthError(403, "No signed-read policy for this key");
    }
  } catch (error) {
    return authErrorResponse(error);
  }

  try {
    const url = await getSignedReadUrl(key, SIGNED_READ_TTL_SECONDS);
    return NextResponse.json({ url, expiresIn: SIGNED_READ_TTL_SECONDS });
  } catch (error) {
    console.error("[api/uploads/read] failed to sign url", error);
    return NextResponse.json({ error: "Failed to generate read URL" }, { status: 500 });
  }
}
