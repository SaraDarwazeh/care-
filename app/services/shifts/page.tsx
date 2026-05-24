import ServiceBookingPage from "@/components/services/ServiceBookingPage";
import PlatformShell from "@/components/layout/PlatformShell";
import { serviceCategoryBySlug } from "@/lib/serviceCatalog";

export default function ShiftBasedCarePage() {
  return (
    <PlatformShell mode="service">
      <ServiceBookingPage category={serviceCategoryBySlug.shifts} />
    </PlatformShell>
  );
}
