import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";
import { stripLocalePrefix } from "@/i18n/localePath";

// Locale routing is handled by next-intl. localePrefix: "always" means
// every URL carries an explicit /en or /ar prefix — the bare path /
// 308-redirects to the resolved locale. Locale resolution order is:
// NEXT_LOCALE cookie → Accept-Language header → DEFAULT_LOCALE.
const intlMiddleware = createIntlMiddleware({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeDetection: true,
});

// Routes that are reachable without a session. Compared against the
// pathname AFTER the locale prefix has been stripped.
const PUBLIC_ROUTES = ["/", "/login", "/register", "/services", "/community"];
const PUBLIC_PREFIXES = ["/_next/", "/favicon"];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith("/services/") || pathname.startsWith("/community/")) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  // Guest browsing of the nurse marketplace.
  if (pathname === "/patient/nurses" || pathname.startsWith("/patient/nurses/")) return true;
  return false;
}

// Renamed from `middleware` per Next 16 deprecation guidance:
// https://nextjs.org/docs/messages/middleware-to-proxy
export function proxy(request: NextRequest): NextResponse {
  // Let next-intl decide on locale redirects first; if it rewrites or
  // redirects, honor that response immediately.
  const intlResponse = intlMiddleware(request);
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const localeStripped = stripLocalePrefix(request.nextUrl.pathname);
  if (isPublicRoute(localeStripped)) {
    return intlResponse;
  }

  const session = request.cookies.get("careplus_session");
  if (!session?.value) {
    const loginUrl = new URL(request.nextUrl.pathname, request.url);
    // Find the active locale so we redirect to the same locale's /login.
    const localeMatch = LOCALES.find(
      (l) => request.nextUrl.pathname === `/${l}` || request.nextUrl.pathname.startsWith(`/${l}/`),
    );
    const locale = localeMatch ?? DEFAULT_LOCALE;
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.searchParams.set("redirect", stripLocalePrefix(request.nextUrl.pathname));
    return NextResponse.redirect(loginUrl);
  }

  return intlResponse;
}

export const config = {
  // Run on everything except API routes, Next internals, and static files.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
