"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  CalendarClock, 
  Store, 
  ShoppingBag, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Nurses", href: "/admin/nurses", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Bookings", href: "/admin/bookings", icon: CalendarClock },
  { name: "Products", href: "/admin/products", icon: Store },
  { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { name: "Medical Records", href: "/admin/records", icon: FileText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    if (auth) await signOut(auth);
    router.push("/login");
  }

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
        fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex h-20 items-center px-8 bg-slate-950/50 border-b border-slate-800">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
              <Stethoscope className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Care Plus Admin</span>
          </Link>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          <div className="mb-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Management
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
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
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
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
            <span className="font-bold text-slate-800">Admin Panel</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu className="h-6 w-6" />
          </button>
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
