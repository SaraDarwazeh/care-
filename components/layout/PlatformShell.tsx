import PlatformNavbar from "@/components/layout/PlatformNavbar";
import PlatformFooter from "@/components/layout/PlatformFooter";

export default function PlatformShell({
  children,
  mode = "home",
}: {
  children: React.ReactNode;
  mode?: "home" | "service";
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <PlatformNavbar mode={mode} />
      {children}
      <PlatformFooter />
    </div>
  );
}
