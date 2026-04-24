import Card from "@/components/ui/Card";
import { AppUser } from "@/lib/types";

export default function UserInfoCard({ user }: { user: AppUser }) {
  return (
    <Card title="Your Profile" description="Basic account information from Firestore.">
      <dl className="space-y-2 text-sm text-slate-700">
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium">Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium">Role</dt>
          <dd className="capitalize">{user.role}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium">Status</dt>
          <dd className="capitalize">{user.status}</dd>
        </div>
      </dl>
    </Card>
  );
}
