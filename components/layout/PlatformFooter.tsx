import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function PlatformFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-10 text-center sm:px-8">
      <div className="flex items-center justify-center gap-2 text-sky-700 mb-4">
        <ShieldCheck className="h-6 w-6" />
        <span className="text-lg font-extrabold">Care Plus</span>
      </div>
      <p className="text-sm text-slate-500">© 2026 Care Plus. Premium home healthcare across patients, nurses, and families.</p>
      <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
        <Link href="/services" className="text-sm font-semibold text-slate-500 hover:text-sky-600 transition">
          Services
        </Link>
        <Link href="/patient/nurses" className="text-sm font-semibold text-slate-500 hover:text-sky-600 transition">
          Nurses
        </Link>
        <Link href="/patient/store" className="text-sm font-semibold text-slate-500 hover:text-violet-600 transition">
          Store
        </Link>
        <Link href="/login" className="text-sm font-semibold text-slate-500 hover:text-sky-600 transition">
          Login
        </Link>
      </div>
      <div className="border-t border-slate-200 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-700 transition">Privacy Policy</Link>
          <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-700 transition">Terms of Service</Link>
          <a href="mailto:support@careplus.health" className="text-xs text-slate-500 hover:text-slate-700 transition">Contact Us</a>
        </div>
      </div>
    </footer>
  );
}
