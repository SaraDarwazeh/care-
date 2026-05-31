"use client";

import { CalendarClock, HeartHandshake, Pill } from "lucide-react";
import type { ServiceSlug } from "@/lib/serviceCatalog";

// Static slug→icon dispatch. We can't put `<Icon />` in the consumer
// via a function-returned component reference because the React compiler
// lint (`react-hooks/static-components`) treats it as a component
// created during render. Branching inline inside this static component
// satisfies the rule with no behavioural change.
export default function ServiceIcon({
  slug,
  className,
}: {
  slug: ServiceSlug;
  className?: string;
}) {
  switch (slug) {
    case "one-time":
      return <Pill className={className} />;
    case "shifts":
      return <CalendarClock className={className} />;
    case "packages":
      return <HeartHandshake className={className} />;
  }
}
