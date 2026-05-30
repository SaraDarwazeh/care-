"use client";

import { Link } from "@/i18n/navigation";
import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { resetPassword } from "@/services/authService";
import { getLocalizedErrorMessage } from "@/services/errorService";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const tRoot = useTranslations();
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(t("success"));
    } catch (submitError) {
      setError(getLocalizedErrorMessage(submitError, tRoot));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <Card title={t("title")} description={t("description")}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label={t("emailLabel")}
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" loading={loading}>
            {t("submit")}
          </Button>

          <Link href="/login" className="inline-block text-sm text-sky-700 hover:underline">
            {t("backToLogin")}
          </Link>
        </form>
      </Card>
    </main>
  );
}
