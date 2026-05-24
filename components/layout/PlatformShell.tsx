import PlatformNavbar from "@/components/layout/PlatformNavbar";
import PlatformFooter from "@/components/layout/PlatformFooter";

export default function PlatformShell({
  children,
}: {
  children: React.ReactNode;
  // `mode` is accepted for backwards compatibility but no longer used —
  // PlatformNavbar is now role-aware and switches its own link set.
  mode?: "home" | "service";
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <PlatformNavbar />
      {children}
      <PlatformFooter />
    </div>
  );
}
