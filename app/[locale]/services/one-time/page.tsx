import ServiceBookingPage from "@/components/services/ServiceBookingPage";
import PlatformShell from "@/components/layout/PlatformShell";
import { serviceCategoryBySlug } from "@/lib/serviceCatalog";

export default function OneTimeServicesPage() {
  return (
    <PlatformShell mode="service">
      <ServiceBookingPage category={serviceCategoryBySlug["one-time"]} />
    </PlatformShell>
  );
}
