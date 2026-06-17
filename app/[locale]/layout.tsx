import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nunito, Source_Sans_3, Tajawal, Cairo } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import AppProviders from "@/components/providers/AppProviders";
import LocaleMismatchBanner from "@/components/common/LocaleMismatchBanner";
import { LOCALES, dirFor, type Locale } from "@/i18n/config";
import "../globals.css";

// Latin pair — current English typography. Kept exactly as it was.
const headingLatin = Nunito({
  variable: "--font-heading-latin",
  subsets: ["latin"],
});
const bodyLatin = Source_Sans_3({
  variable: "--font-body-latin",
  subsets: ["latin"],
});

// Arabic pair. Tajawal pairs visually with Source Sans 3 (similar
// humanist proportions); Cairo's heavier weights stand in for Nunito's
// rounded display feel without going decorative.
const bodyArabic = Tajawal({
  variable: "--font-body-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});
const headingArabic = Cairo({
  variable: "--font-heading-arabic",
  subsets: ["arabic"],
  weight: ["700", "800", "900"],
});

// Locale-aware metadata. Each rendered URL declares its own canonical +
// hreflang alternates so /en and /ar don't compete in search rankings
// (plan §Risks #7). Next.js doesn't allow both `metadata` and
// `generateMetadata` in the same file — everything lives here.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) {
    return { title: "Care+" };
  }
  return {
    title: "Care+",
    description: "Beginner-friendly healthcare MVP foundation",
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        ar: "/ar",
        "x-default": "/en",
      },
    },
  };
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}


export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) {
    notFound();
  }
  // Required for static rendering with next-intl.
  setRequestLocale(locale);

  const dir = dirFor(locale as Locale);
  const fontVars = [
    headingLatin.variable,
    bodyLatin.variable,
    headingArabic.variable,
    bodyArabic.variable,
  ].join(" ");

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fontVars} h-full scroll-smooth antialiased`}
    >
      {/* suppressHydrationWarning silences benign mismatches on <body>
          caused by browser extensions (ColorZilla's cz-shortcut-listen,
          Grammarly's data-* attributes, dark-mode extensions). Without
          this, every user running such an extension sees a console
          hydration error on every page. The flag is scoped to <body>
          only — real hydration mismatches deeper in the tree still log. */}
      <body suppressHydrationWarning className="min-h-full bg-background text-foreground font-sans">
        <NextIntlClientProvider>
          <LocaleMismatchBanner />
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
