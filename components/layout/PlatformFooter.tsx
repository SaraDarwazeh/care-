import Link from "next/link";
import { ShieldCheck } from "lucide-react";

// Grouped footer IA so visitors can find any of the platform's four pillars
// (Care, Shop, Connect, Company) plus account access from any page.
const SECTIONS: Array<{
  title: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: "Care",
    links: [
      { label: "Services", href: "/services" },
      { label: "Care Packages", href: "/services/packages" },
      { label: "Find a Nurse", href: "/patient/nurses" },
    ],
  },
  {
    title: "Shop",
    links: [{ label: "Medical Store", href: "/patient/store" }],
  },
  {
    title: "Connect",
    links: [{ label: "Community", href: "/community" }],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
      { label: "Join as nurse", href: "/register?role=nurse" },
    ],
  },
];

export default function PlatformFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-center gap-2 text-sky-700 mb-8">
          <ShieldCheck className="h-6 w-6" />
          <span className="text-lg font-extrabold">Care+</span>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 mb-10">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                {section.title}
              </p>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-slate-600 hover:text-sky-600 transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6 text-center">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Care+. Premium home healthcare across patients, nurses, and families.
          </p>
          <div className="mt-4 flex items-center justify-center flex-wrap gap-4">
            <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-700 transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-700 transition">
              Terms of Service
            </Link>
            <a
              href="mailto:support@careplus.health"
              className="text-xs text-slate-500 hover:text-slate-700 transition"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
