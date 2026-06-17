"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, CalendarClock, Clock, User, DollarSign, Store, Menu, X, CalendarDays, Bell, FileText } from "lucide-react";
import { useState } from "react";
import { CartProvider } from "@/components/patient/CartContext";
import Logo from "@/components/common/Logo";
import NotificationBell from "@/components/common/NotificationBell";
import ProfileMenu from "@/components/common/ProfileMenu";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";

interface NavItem {
  /** Key under nurse.nav.* */
  key: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard",     href: "/nurse",               icon: LayoutDashboard },
  { key: "bookings",      href: "/nurse/bookings",      icon: CalendarClock },
  { key: "records",       href: "/nurse/records",       icon: FileText },
  { key: "schedule",      href: "/nurse/schedule",      icon: Clock },
  { key: "availability",  href: "/nurse/availability",  icon: CalendarDays },
  { key: "earnings",      href: "/nurse/earnings",      icon: DollarSign },
  { key: "store",         href: "/nurse/store",         icon: Store },
  { key: "notifications", href: "/nurse/notifications", icon: Bell },
  { key: "profile",       href: "/nurse/setup",         icon: User },
];

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("nurse.nav");
  const [open, setOpen] = useState(false);

  return (
    <CartProvider>
    <div className="flex h-screen bg-slate-50">
      {open && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Slide-off transforms scoped to max-lg: so the rtl variant doesn't
          push the sidebar off-screen on desktop RTL. See admin layout
          for the full reasoning. */}
      <aside className={`fixed inset-y-0 start-0 z-50 w-72 flex flex-col bg-gradient-to-b from-brand-deep to-slate-900 text-slate-300 transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "max-lg:-translate-x-full max-lg:rtl:translate-x-full"}`}>
        <div className="flex h-20 items-center gap-3 px-6 bg-white/95 border-b border-white/10">
          <Link href="/nurse" aria-label="Care+" className="inline-flex items-center transition hover:opacity-85">
            <Logo variant="full" size={36} />
          </Link>
          <button className="ms-auto lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          <p className="mb-4 px-4 text-xs font-bold text-brand-soft/70 uppercase tracking-widest">{t("workspace")}</p>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.key} href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${isActive ? "bg-brand text-white shadow-md shadow-brand/20" : "hover:bg-white/10 hover:text-white"}`}
                onClick={() => setOpen(false)}>
                <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-brand-soft"}`} />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <LocaleSwitcher />
          <ProfileMenu variant="sidebar" />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex h-20 items-center justify-between bg-white px-6 shadow-sm border-b border-slate-200 lg:hidden shrink-0">
          <Link href="/nurse" aria-label={t("portalLabel")} className="inline-flex items-center">
            <Logo variant="full" size={28} />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell href="/nurse/notifications" />
            <button onClick={() => setOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </div>
      </main>
    </div>
    </CartProvider>
  );
}
