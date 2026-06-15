import { NextResponse } from 'next/server';
import { validateBooking } from '@/services/bookingService';
import { authErrorResponse, requireRole } from '@/lib/auth/verifyRequest';
import type { NextRequest } from 'next/server';

// Gate the validator behind an authenticated session. The payload
// references nurseId / patientId / shift / date — anonymous probing
// could leak availability or shape attacks against valid IDs. Any
// signed-in user (patient/nurse/admin) can validate; the underlying
// service does the data-shape checks.
export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['patient', 'nurse', 'admin']);
  } catch (error) {
    return authErrorResponse(error);
  }

  try {
    const body = await req.json();
    await validateBooking(body);
    return NextResponse.json({ valid: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ valid: false, error: message }, { status: 400 });
  }
}
