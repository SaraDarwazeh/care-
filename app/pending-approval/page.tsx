import Link from "next/link";
import Card from "@/components/ui/Card";

export default function PendingApprovalPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-16">
      <Card title="Approval Pending" description="Your nurse account is waiting for admin review.">
        <p className="text-sm text-slate-600">
          You can log in, but nurse dashboard access is available only after approval.
        </p>
        <div className="mt-4">
          <Link href="/login" className="text-sm font-semibold text-sky-700 hover:underline">
            Back to login
          </Link>
        </div>
      </Card>
    </main>
  );
}
