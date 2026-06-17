"use client";

import { useEffect } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import Card from "@/components/ui/Card";
import { logoutUser } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";

export default function PendingApprovalPage() {
  const t = useTranslations("auth.pendingApproval");
  const router = useRouter();
  const { appUser } = useAuth();

  // A nurse who's still at status "incomplete" never finished the
  // profile wizard — landing on /pending-approval would be confusing.
  // Bounce them straight to /nurse/setup so they finish the form
  // before they hit the review queue.
  useEffect(() => {
    if (appUser?.role === "nurse" && appUser.status === "incomplete") {
      router.replace("/nurse/setup");
    }
  }, [appUser, router]);

  async function handleLogout() {
    await logoutUser();
    router.replace("/login");
  }

  // Distinguish first-time pending from "resubmitted after profile edit"
  // by checking approvedAt: it's only stamped on a successful approval,
  // so a value here + status===pending_review means we re-pending'd
  // this nurse. Legacy "pending" records are treated the same.
  const isResubmission = !!appUser?.approvedAt;
  const title = isResubmission ? t("resubmitTitle") : t("title");
  const description = isResubmission ? t("resubmitDescription") : t("description");
  const body = isResubmission ? t("resubmitBody") : t("body");

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-16">
      <Card title={title} description={description}>
        <p className="text-sm text-slate-600">{body}</p>
        <div className="mt-4 flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-brand-deep hover:underline">
            {t("backToLogin")}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </button>
        </div>
      </Card>
    </main>
  );
}
