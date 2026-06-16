"use client";

import { useTranslations } from "next-intl";
import { Mail, MessageCircle, Phone, Send, X } from "lucide-react";
import { useEffect } from "react";
import { getActiveContactChannels, hrefFor, type ContactChannel } from "@/lib/contactChannels";

interface CoordinatorPanelProps {
  open: boolean;
  onClose: () => void;
}

const ICONS: Record<ContactChannel["kind"], typeof Mail> = {
  email: Mail,
  whatsapp: MessageCircle,
  phone: Phone,
  telegram: Send,
};

// Channel-agnostic contact sheet. Renders whatever channels are
// configured in lib/contactChannels.ts; adding WhatsApp / phone /
// Telegram later is a one-line edit there.
export default function CoordinatorPanel({ open, onClose }: CoordinatorPanelProps) {
  const t = useTranslations("findCare.coordinator");
  const channels = getActiveContactChannels();

  // Close on Escape so the panel stays keyboard-friendly.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{t("title")}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("body")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          {t("channelsHeading")}
        </p>
        <div className="grid gap-2">
          {channels.map((channel) => {
            const Icon = ICONS[channel.kind];
            return (
              <a
                key={channel.kind}
                href={hrefFor(channel)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-sky-300 hover:bg-sky-50"
                target={channel.kind === "whatsapp" || channel.kind === "telegram" ? "_blank" : undefined}
                rel={channel.kind === "whatsapp" || channel.kind === "telegram" ? "noopener noreferrer" : undefined}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{t(`kinds.${channel.kind}`)}</p>
                  <p className="truncate text-xs text-slate-500" dir="ltr">
                    {channel.value}
                  </p>
                </div>
              </a>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-slate-400">{t("fallbackChannelHint")}</p>
      </div>
    </div>
  );
}
