import { NextResponse } from 'next/server';
import { validateBooking } from '@/services/bookingService';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await validateBooking(body);
    return NextResponse.json({ valid: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ valid: false, error: message }, { status: 400 });
  }
}
