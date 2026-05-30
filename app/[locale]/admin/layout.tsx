"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarClock,
  Store,
  ShoppingBag,
  FileText,
  Settings,
  Menu,
  X,
  HeartHandshake,
  HandHeart,
  Bell,
  BookOpen,
  Activity,
} from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/common/NotificationBell";
import ProfileMenu from "@/components/common/ProfileMenu";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";

// Nav structure keeps href/icon static and resolves the label at render
// time via the admin.chrome.nav.* translation namespace.
const NAV_ITEMS = [
  { key: "dashboard", href: "/admin", icon: LayoutDashboard },
  { key: "nurses", href: "/admin/nurses", icon: Stethoscope },
  { key: "patients", href: "/admin/patients", icon: Users },
  { key: "bookings", href: "/admin/bookings", icon: CalendarClock },
  { key: "packages", href: "/admin/packages", icon: HeartHandshake },
  { key: "products", href: "/admin/products", icon: Store },
  { key: "orders", href: "/admin/orders", icon: ShoppingBag },
  { key: "records", href: "/admin/records", icon: FileText },
  { key: "community", href: "/admin/community", icon: HandHeart },
  { key: "education", href: "/admin/education", icon: BookOpen },
  { key: "notifications", href: "/admin/notifications", icon: Bell },
  { key: "systemStatus", href: "/admin/system-status", icon: Activity },
  { key: "settings", href: "/admin/settings", icon: Settings },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useTranslations("admin.chrome");
  const tNav = useTranslations("admin.chrome.nav");

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 start-0 z-50 w-72 flex flex-col bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"}
      `}>
        <div className="flex h-20 items-center px-8 bg-slate-950/50 border-b border-slate-800">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
              <Stethoscope className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">{t("brand")}</span>
          </Link>
          <button className="ms-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          <div className="mb-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t("navHeading")}
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all
                  ${isActive
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/10"
                    : "hover:bg-slate-800 hover:text-white"
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                {tNav(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <LocaleSwitcher />
          <ProfileMenu variant="sidebar" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-20 items-center justify-between bg-white px-6 shadow-sm border-b border-slate-200 lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-800">{t("mobileBrand")}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell href="/admin/notifications" />
            <button onClick={() => setSidebarOpen(true)} className="p-2 -me-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
