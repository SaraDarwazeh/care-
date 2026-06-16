// Deterministic mapping from the /find-care diagnostic answers to a
// /patient/nurses URL. No AI, no embeddings — pure if-then-else over
// a small answer space. The mapping is documented per branch so the
// product team can adjust without re-reading the code.
//
// Why URL params instead of session state: the marketplace already
// honors ?service=, ?shift=, ?bookingType=, and ?availableToday= as
// pre-filters (see app/[locale]/patient/nurses/page.tsx). Routing
// through the same URL contract means /find-care doesn't introduce a
// new state layer — it just steers the existing engine.

export const RECIPIENT_OPTIONS = [
  "self",
  "parent",
  "grandparent",
  "child",
  "spouse",
  "other-family",
] as const;
export type Recipient = (typeof RECIPIENT_OPTIONS)[number];

export const SITUATION_OPTIONS = [
  "post-surgery",
  "chronic-condition",
  "daily-support",
  "overnight",
  "pregnancy-newborn",
  "specific-task",
  "not-sure",
] as const;
export type Situation = (typeof SITUATION_OPTIONS)[number];

export const WHEN_OPTIONS = [
  "today",
  "this-week",
  "this-month",
  "ongoing",
  "not-sure",
] as const;
export type When = (typeof WHEN_OPTIONS)[number];

export interface FindCareAnswers {
  recipient: Recipient;
  situation: Situation;
  when: When;
}

export interface FindCareMatchTarget {
  // Final href the patient is sent to. Always /patient/nurses with a
  // pre-filter set; the marketplace + nurse detail + booking form
  // honor every param the mapper writes.
  href: string;
  // Human-readable summary of what was matched. The result page shows
  // this so the patient understands why the marketplace looks the way
  // it does. Strings are i18n keys, not literal copy.
  summaryKey: string;
  // Whether the route should be considered "urgent" so the patient
  // navbar / marketplace can render an "available today" prompt.
  urgent: boolean;
}

// Helper: does the recipient skew elderly? Parents and grandparents do
// in our market; children obviously don't. Used to pick between
// "elderly care" and broader chronic-care services.
function isElderlyRecipient(recipient: Recipient): boolean {
  return recipient === "parent" || recipient === "grandparent";
}

function isPediatricRecipient(recipient: Recipient): boolean {
  return recipient === "child";
}

function isOngoing(when: When): boolean {
  return when === "ongoing" || when === "this-month";
}

export function mapAnswersToParams(input: FindCareAnswers): URLSearchParams {
  const params = new URLSearchParams();
  const elderly = isElderlyRecipient(input.recipient);
  const pediatric = isPediatricRecipient(input.recipient);
  const urgent = input.when === "today";

  switch (input.situation) {
    case "post-surgery":
      // Post-op recovery typically becomes a package when the support
      // spans more than a single visit; a same-day or single-week
      // post-op need is a one-time wound-care visit instead.
      params.set("service", "post-operative care");
      params.set("bookingType", isOngoing(input.when) ? "package" : "one-time");
      break;

    case "chronic-condition":
      // Chronic conditions always imply repeat care — bias to packages.
      // Elderly recipients route through the elderly-care service so
      // the patient sees nurses with elderly specialization.
      params.set("bookingType", "package");
      if (elderly) params.set("service", "elderly care");
      else if (pediatric) params.set("service", "pediatric");
      else params.set("service", "chronic disease management");
      break;

    case "daily-support":
      // "Daily support" is the canonical use case for shift bookings,
      // unless the patient explicitly framed it as ongoing — then a
      // package makes more sense than booking shift-by-shift.
      if (isOngoing(input.when)) {
        params.set("bookingType", "package");
        if (elderly) params.set("service", "elderly care");
      } else {
        params.set("bookingType", "shift");
        // Morning shift is the platform's most-staffed default and the
        // safest pre-fill when we don't know the patient's preference.
        params.set("shift", "a");
      }
      break;

    case "overnight":
      // Overnight always maps to shift C; bookingType is shift.
      params.set("bookingType", "shift");
      params.set("shift", "c");
      break;

    case "pregnancy-newborn":
      // Mother & baby care is its own service. Packages for ongoing
      // postnatal care; one-time for a single visit ("today" / "this
      // week").
      params.set("service", "mother and baby care");
      params.set("bookingType", isOngoing(input.when) ? "package" : "one-time");
      break;

    case "specific-task":
      // Patient knows exactly what they need; preserve their booking
      // mode (one-time) but don't pre-filter by service — they'll pick
      // from the catalogue once they see the nurse list.
      params.set("bookingType", "one-time");
      break;

    case "not-sure":
      // No mode pre-applied; the "Not sure?" panel on the result page
      // surfaces the human-handoff channels.
      break;
  }

  if (urgent) {
    params.set("availableToday", "1");
  }

  return params;
}

export function buildMatchTarget(input: FindCareAnswers): FindCareMatchTarget {
  const params = mapAnswersToParams(input);
  const qs = params.toString();
  return {
    href: qs ? `/patient/nurses?${qs}` : "/patient/nurses",
    // The summary key composes situation + (urgent | ongoing) so the
    // result page i18n can render a sentence like "Care for daily
    // support, starting today."
    summaryKey: `summary.${input.situation}`,
    urgent: input.when === "today",
  };
}
