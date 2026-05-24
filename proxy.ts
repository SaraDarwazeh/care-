import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/services", "/community"];
const PUBLIC_PREFIXES = ["/api/", "/_next/", "/favicon"];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

// Renamed from `middleware` per Next 16 deprecation guidance:
// https://nextjs.org/docs/messages/middleware-to-proxy
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow guest browsing of the nurse marketplace.
  const isGuestAllowed =
    pathname === "/patient/nurses" || pathname.startsWith("/patient/nurses/");
  if (isGuestAllowed) return NextResponse.next();

  const session = request.cookies.get("careplus_session");
  if (!session?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/patient/:path*", "/nurse/:path*", "/admin/:path*"],
};
