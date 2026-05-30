import { useTranslations } from "next-intl";
import PlatformShell from "@/components/layout/PlatformShell";

export default function PrivacyPolicyPage() {
  const t = useTranslations("legal");
  const sections = t.raw("privacy.sections") as Array<{ heading: string; body: string }>;

  return (
    <PlatformShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">{t("privacy.title")}</h1>
        <p className="text-sm text-slate-500 mb-8">{t("lastUpdated")}</p>

        <div className="space-y-8 text-slate-700">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{section.heading}</h2>
              <p className="text-sm leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </PlatformShell>
  );
}
