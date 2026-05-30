"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { logoutUser } from "@/services/authService";

export default function TopNav() {
  const router = useRouter();
  const { appUser } = useAuth();

  async function onLogout() {
    await logoutUser();
    router.push("/login");
  }

  return (
    <header className="border-b border-sky-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-sky-700">
          Care+
        </Link>
        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-slate-600 sm:block">
            {appUser ? `${appUser.name} (${appUser.role})` : "Guest"}
          </p>
          {appUser ? (
            <div className="w-24">
              <Button type="button" onClick={onLogout} variant="secondary">
                Logout
              </Button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
