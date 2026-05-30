"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  Shield,
  ShieldCheck,
  Activity,
  Sparkles,
  Clock,
  Users,
  Stethoscope,
  Home,
  Pill,
  Calendar,
  Phone,
  Check,
  Star,
  Award,
  HeartHandshake,
  HelpCircle,
  Info,
  Lightbulb,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { EducationCard, EducationCardKind } from "@/lib/types";
import { getActiveEducationCards } from "@/services/educationService";
import { tLocalized } from "@/lib/i18nContent";
import type { Locale } from "@/i18n/config";

// Curated lucide icon set — same map the admin form uses, so admins can
// only pick from icons we know how to render here. Falls back to
// HelpCircle when an unknown name is stored.
export const EDUCATION_ICONS: Record<string, typeof HelpCircle> = {
  Heart,
  Shield,
  ShieldCheck,
  Activity,
  Sparkles,
  Clock,
  Users,
  Stethoscope,
  Home,
  Pill,
  Calendar,
  Phone,
  Check,
  Star,
  Award,
  HeartHandshake,
  HelpCircle,
  Info,
  Lightbulb,
};

export const EDUCATION_ICON_CHOICES = Object.keys(EDUCATION_ICONS);

const ACCENT_CLASSES: Record<string, { tile: string; iconBg: string; iconText: string }> = {
  sky:     { tile: "border-sky-100 hover:border-sky-200",         iconBg: "bg-sky-100",     iconText: "text-sky-700" },
  emerald: { tile: "border-emerald-100 hover:border-emerald-200", iconBg: "bg-emerald-100", iconText: "text-emerald-700" },
  violet:  { tile: "border-violet-100 hover:border-violet-200",   iconBg: "bg-violet-100",  iconText: "text-violet-700" },
  amber:   { tile: "border-amber-100 hover:border-amber-200",     iconBg: "bg-amber-100",   iconText: "text-amber-700" },
  rose:    { tile: "border-rose-100 hover:border-rose-200",       iconBg: "bg-rose-100",    iconText: "text-rose-700" },
};

// Kind → message-key mapping. The JSON nests under educationSection.kinds
// using a camelCase variant of the "what-to-expect" kind so it's a valid
// JS property in any callsite.
const KIND_TO_KEY: Record<EducationCardKind, "why" | "faq" | "whatToExpect"> = {
  why: "why",
  faq: "faq",
  "what-to-expect": "whatToExpect",
};

const KIND_ORDER: EducationCardKind[] = ["why", "what-to-expect", "faq"];

export default function EducationSection() {
  const t = useTranslations("community.educationSection");
  const locale = useLocale() as Locale;
  const [cards, setCards] = useState<EducationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKind, setActiveKind] = useState<EducationCardKind>("why");

  useEffect(() => {
    let active = true;
    getActiveEducationCards()
      .then((data) => {
        if (active) setCards(data);
      })
      .catch((err) => console.error("[EducationSection] load failed", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cardsByKind = useMemo(() => {
    const groups: Record<EducationCardKind, EducationCard[]> = {
      why: [],
      faq: [],
      "what-to-expect": [],
    };
    for (const card of cards) groups[card.kind]?.push(card);
    return groups;
  }, [cards]);

  // Only show kind tabs that actually have content — keeps the surface
  // honest. If admins disable an entire kind, the tab disappears.
  const availableKinds = useMemo(
    () => KIND_ORDER.filter((k) => cardsByKind[k].length > 0),
    [cardsByKind],
  );

  // If the currently-selected kind has no cards (e.g. all disabled),
  // fall back to the first available one.
  const effectiveKind: EducationCardKind =
    cardsByKind[activeKind].length > 0 ? activeKind : availableKinds[0] ?? "why";

  if (loading) {
    return (
      <section className="scroll-mt-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }

  if (availableKinds.length === 0) return null;

  const displayedCards = cardsByKind[effectiveKind];

  return (
    <section id="learn" className="scroll-mt-20">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">{t("kicker")}</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t("title")}</h2>
        <p className="mt-3 text-base leading-relaxed text-slate-500">{t("subtitle")}</p>
      </div>

      {/* Kind tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {availableKinds.map((kind) => {
          const active = effectiveKind === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setActiveKind(kind)}
              className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                active
                  ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-slate-700"
              }`}
            >
              {t(`kinds.${KIND_TO_KEY[kind]}`)}
              <span
                className={`ms-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {cardsByKind[kind].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedCards.map((card) => {
          const Icon = (card.icon && EDUCATION_ICONS[card.icon]) || HelpCircle;
          const accent = (card.accent && ACCENT_CLASSES[card.accent]) || ACCENT_CLASSES.sky;
          return (
            <div
              key={card.id}
              className={`rounded-3xl border bg-white p-6 shadow-sm transition ${accent.tile}`}
            >
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${accent.iconBg}`}>
                <Icon className={`h-5 w-5 ${accent.iconText}`} />
              </div>
              <h3 className="font-bold text-slate-800 leading-snug">{tLocalized(card.title, locale)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{tLocalized(card.body, locale)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
