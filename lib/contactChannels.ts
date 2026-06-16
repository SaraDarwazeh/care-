// Channel-agnostic contact configuration. Replaces ad-hoc "mailto:"
// links scattered through the UI with a single registry the team can
// extend without touching components. Add a new entry here and the
// "Talk to a coordinator" surfaces light up everywhere automatically.
//
// Status today: only the email fallback is real. WhatsApp, phone, and
// Telegram entries are pre-wired with empty `value`s; flipping any to
// a real number / handle activates that channel immediately. The UI
// only renders entries whose `value` is non-empty.

export type ContactChannelKind = "email" | "whatsapp" | "phone" | "telegram";

export interface ContactChannel {
  kind: ContactChannelKind;
  /**
   * Destination value:
   *   email     → bare address (no mailto:)
   *   whatsapp  → E.164 phone number, no plus sign (wa.me appends it)
   *   phone     → E.164 phone number with leading +
   *   telegram  → handle without the @
   * Empty string disables the channel.
   */
  value: string;
  /** Optional override; UI falls back to the kind's default copy. */
  labelKey?: string;
}

// Edit this list when new coordinator channels come online. Order
// determines display order in the "Talk to a coordinator" panel.
const CHANNELS: ReadonlyArray<ContactChannel> = [
  { kind: "whatsapp", value: "" },
  { kind: "phone", value: "" },
  { kind: "telegram", value: "" },
  { kind: "email", value: "support@careplus.health" },
];

export function getActiveContactChannels(): ContactChannel[] {
  return CHANNELS.filter((c) => c.value.trim().length > 0);
}

// Produce the href the UI should link to for a channel. Centralised so
// every component formats wa.me / tel: / mailto: identically.
export function hrefFor(channel: ContactChannel): string {
  switch (channel.kind) {
    case "email":
      return `mailto:${channel.value}`;
    case "whatsapp":
      return `https://wa.me/${channel.value}`;
    case "phone":
      return `tel:+${channel.value.replace(/[^\d]/g, "")}`;
    case "telegram":
      return `https://t.me/${channel.value.replace(/^@/, "")}`;
  }
}
