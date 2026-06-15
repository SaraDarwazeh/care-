import { NextRequest, NextResponse } from "next/server";
import { computePricing } from "@/services/pricingService";
import { authErrorResponse, requireRole } from "@/lib/auth/verifyRequest";

// Gate the pricing endpoint behind an authenticated session. The
// payload accepts arbitrary nurseId + addons + duration + shift, so an
// anonymous caller could probe per-nurse rates or DoS the computation.
// Any signed-in user can compute pricing; the service handles whatever
// data-shape errors come through.
export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ["patient", "nurse", "admin"]);
  } catch (error) {
    return authErrorResponse(error);
  }

  try {
    const body = await req.json();
    const pricing = await computePricing(body);
    return NextResponse.json({ success: true, pricing });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
