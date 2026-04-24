"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { resetPassword } from "@/services/authService";
import { getErrorMessage } from "@/services/errorService";

export default function ForgotPasswordPage() {
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
      setSuccess("Password reset email sent. Check your inbox.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <Card title="Reset password" description="Enter your email to receive a reset link.">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" loading={loading}>
            Send reset link
          </Button>

          <Link href="/login" className="inline-block text-sm text-sky-700 hover:underline">
            Back to login
          </Link>
        </form>
      </Card>
    </main>
  );
}
