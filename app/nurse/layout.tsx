"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, CalendarClock, Clock, User, DollarSign, Store, LogOut, Menu, X, Stethoscope } from "lucide-react";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { CartProvider } from "@/components/patient/CartContext";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/nurse", icon: LayoutDashboard },
  { name: "Bookings", href: "/nurse/bookings", icon: CalendarClock },
  { name: "Schedule", href: "/nurse/schedule", icon: Clock },
  { name: "Earnings", href: "/nurse/earnings", icon: DollarSign },
  { name: "Store", href: "/nurse/store", icon: Store },
  { name: "Profile", href: "/nurse/setup", icon: User },
];

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    if (auth) await signOut(auth);
    router.push("/login");
  }

  return (
    <CartProvider>
    <div className="flex h-screen bg-slate-50">
      {open && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-gradient-to-b from-emerald-900 to-slate-900 text-slate-300 transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center gap-3 px-8 border-b border-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <Stethoscope className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-white">Care Plus</span>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          <p className="mb-4 px-4 text-xs font-bold text-emerald-400/60 uppercase tracking-widest">Nurse Workspace</p>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${isActive ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "hover:bg-white/10 hover:text-white"}`}
                onClick={() => setOpen(false)}>
                <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-emerald-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex h-20 items-center justify-between bg-white px-6 shadow-sm border-b border-slate-200 lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-800">Nurse Portal</span>
          </div>
          <button onClick={() => setOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu className="h-6 w-6" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </div>
      </main>
    </div>
    </CartProvider>
  );
}
