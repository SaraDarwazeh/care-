import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Card from "@/components/ui/Card";

export default function PendingApprovalPage() {
  const t = useTranslations("auth.pendingApproval");
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-16">
      <Card title={t("title")} description={t("description")}>
        <p className="text-sm text-slate-600">{t("body")}</p>
        <div className="mt-4">
          <Link href="/login" className="text-sm font-semibold text-sky-700 hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      </Card>
    </main>
  );
}
