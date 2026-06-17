import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";

// Grouped footer IA so visitors can find any of the platform's four pillars
// (Care, Shop, Connect, Company) plus account access from any page.
// Items carry translation keys; the active locale resolves them in render.
interface FooterLink {
  /** Key under footer.links in the message bundle. */
  key: string;
  href: string;
}
interface FooterSection {
  /** Key under footer.sections in the message bundle. */
  titleKey: string;
  links: FooterLink[];
}

const SECTIONS: FooterSection[] = [
  {
    titleKey: "care",
    links: [
      { key: "findCare", href: "/find-care" },
      { key: "findANurse", href: "/patient/nurses" },
      { key: "carePackages", href: "/services/packages" },
      { key: "services", href: "/services" },
    ],
  },
  {
    titleKey: "shop",
    links: [{ key: "medicalStore", href: "/patient/store" }],
  },
  {
    titleKey: "connect",
    links: [
      { key: "healthHub", href: "/patient/education" },
      { key: "community", href: "/community" },
    ],
  },
  {
    titleKey: "account",
    links: [
      { key: "signIn", href: "/login" },
      { key: "createAccount", href: "/register" },
      { key: "joinAsNurse", href: "/register?role=nurse" },
    ],
  },
];

export default function PlatformFooter() {
  const t = useTranslations("footer");
  const tagline = t("tagline");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-brand-deep">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-lg font-extrabold">Care+</span>
          </div>
          <LocaleSwitcher />
        </div>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 mb-10">
          {SECTIONS.map((section) => (
            <div key={section.titleKey}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                {t(`sections.${section.titleKey}`)}
              </p>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-slate-600 hover:text-brand transition"
                    >
                      {t(`links.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6 text-center">
          <p className="text-sm text-slate-500">
            {t("copyright", { year, tagline })}
          </p>
          <div className="mt-4 flex items-center justify-center flex-wrap gap-4">
            <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-700 transition">
              {t("legal.privacy")}
            </Link>
            <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-700 transition">
              {t("legal.terms")}
            </Link>
            <a
              href="mailto:support@careplus.health"
              className="text-xs text-slate-500 hover:text-slate-700 transition"
            >
              {t("legal.contact")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
