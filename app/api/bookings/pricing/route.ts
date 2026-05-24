import { NextResponse } from "next/server";
import { computePricing } from "@/services/pricingService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pricing = await computePricing(body);
    return NextResponse.json({ success: true, pricing });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
