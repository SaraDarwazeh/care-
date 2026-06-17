"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronLeft, Sparkles } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import BackLink from "@/components/common/BackLink";
import {
  PHYSIO_ONLY_SITUATIONS,
  RECIPIENT_OPTIONS,
  SITUATION_OPTIONS,
  WHEN_OPTIONS,
  buildMatchTarget,
  type Recipient,
  type Situation,
  type When,
} from "@/lib/findCareMapping";
import { usePhysiotherapyEnabled } from "@/hooks/useSiteSettings";
import CoordinatorPanel from "./CoordinatorPanel";

type Step = 1 | 2 | 3 | "result";

// Three-question diagnostic. Progressive disclosure (each question
// reveals the next once answered) on mobile keeps the surface
// uncluttered; desktop renders the answered questions as collapsed
// summaries above the live one so the patient can backtrack without
// using Back/Next buttons.
export default function FindCareWizard() {
  const t = useTranslations("findCare");
  const tProvider = useTranslations("provider.findCare");
  const router = useRouter();
  const physiotherapyEnabled = usePhysiotherapyEnabled();

  const [step, setStep] = useState<Step>(1);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [situation, setSituation] = useState<Situation | null>(null);
  const [when, setWhen] = useState<When | null>(null);
  const [coordinatorOpen, setCoordinatorOpen] = useState(false);

  // Hide physio-only situations when the admin flag is off. When flag
  // is on, all options appear in their declared order.
  const visibleSituations = useMemo(
    () =>
      SITUATION_OPTIONS.filter(
        (opt) => physiotherapyEnabled || !PHYSIO_ONLY_SITUATIONS.has(opt),
      ),
    [physiotherapyEnabled],
  );

  const canFindMatches = recipient && situation && when;
  const target = useMemo(() => {
    if (!recipient || !situation || !when) return null;
    return buildMatchTarget({ recipient, situation, when });
  }, [recipient, situation, when]);

  function handleRecipient(value: Recipient) {
    setRecipient(value);
    if (step === 1) setStep(2);
  }
  function handleSituation(value: Situation) {
    setSituation(value);
    if (step === 2) setStep(3);
  }
  function handleWhen(value: When) {
    setWhen(value);
    if (step === 3) setStep("result");
  }

  function goBack() {
    if (step === "result") setStep(3);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  }

  function findMatches() {
    if (!target) return;
    router.push(target.href);
  }

  return (
    <div className="space-y-6">
      {/* Top exit — a wizard mid-flow is easy to feel trapped in. The
          BackLink lets anyone bail to the homepage without finishing the
          diagnostic. Matches the leaf-page pattern used everywhere else. */}
      <BackLink href="/" labelKey="findCare.actions.exitToHome" />

      {/* Escape chips — for users who don't want the diagnostic. Per the
          2026-06-17 gap audit, the wizard had become a one-way street;
          this gives anyone who already knows what they want a direct
          path to the four service surfaces. The chips link to the
          /services/{slug} pages which retain the full billing-mode
          context for browse-style discovery. */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {t("alreadyKnow.label")}
        </p>
        {/* Escape chips — 2-up grid on xs so labels never collide on
            320px viewports; switch to flex-wrap at sm+ where the row
            naturally absorbs the variable label widths. */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-1.5">
          <Link
            href="/services/one-time"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-slate-700 transition hover:border-brand-soft hover:text-brand-deep"
          >
            {t("alreadyKnow.options.one-time")}
          </Link>
          <Link
            href="/services/shifts"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-slate-700 transition hover:border-brand-soft hover:text-brand-deep"
          >
            {t("alreadyKnow.options.shifts")}
          </Link>
          <Link
            href="/services/packages"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-slate-700 transition hover:border-brand-soft hover:text-brand-deep"
          >
            {t("alreadyKnow.options.packages")}
          </Link>
          <Link
            href="/services/additional"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-slate-700 transition hover:border-brand-soft hover:text-brand-deep"
          >
            {t("alreadyKnow.options.additional")}
          </Link>
        </div>
      </div>

      {/* Question 1 — recipient */}
      <QuestionCard
        index={1}
        label={t("questions.recipient.label")}
        help={t("questions.recipient.help")}
        active={step === 1}
        answered={recipient !== null && step !== 1}
        summary={recipient ? t(`questions.recipient.options.${recipient}`) : ""}
        onEdit={() => setStep(1)}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {RECIPIENT_OPTIONS.map((opt) => (
            <OptionButton
              key={opt}
              label={t(`questions.recipient.options.${opt}`)}
              selected={recipient === opt}
              onClick={() => handleRecipient(opt)}
            />
          ))}
        </div>
      </QuestionCard>

      {/* Question 2 — situation */}
      {(step === 2 || step === 3 || step === "result" || situation !== null) && (
        <QuestionCard
          index={2}
          label={t("questions.situation.label")}
          help={t("questions.situation.help")}
          active={step === 2}
          answered={situation !== null && step !== 2}
          summary={situation ? situationLabel(situation, t, tProvider) : ""}
          onEdit={() => setStep(2)}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleSituations.map((opt) => (
              <OptionButton
                key={opt}
                label={situationLabel(opt, t, tProvider)}
                selected={situation === opt}
                onClick={() => handleSituation(opt)}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {/* Question 3 — when */}
      {(step === 3 || step === "result" || when !== null) && (
        <QuestionCard
          index={3}
          label={t("questions.when.label")}
          help={t("questions.when.help")}
          active={step === 3}
          answered={when !== null && step !== 3}
          summary={when ? t(`questions.when.options.${when}`) : ""}
          onEdit={() => setStep(3)}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            {WHEN_OPTIONS.map((opt) => (
              <OptionButton
                key={opt}
                label={t(`questions.when.options.${opt}`)}
                selected={when === opt}
                onClick={() => handleWhen(opt)}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {/* Result + CTAs */}
      {step === "result" && canFindMatches && target && (
        <div className="rounded-3xl border border-brand-soft bg-gradient-to-br from-brand-soft/30 to-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-deep">
              {t("result.title")}
            </p>
          </div>
          <p className="mt-3 text-base font-semibold text-slate-800">
            {situation && PHYSIO_ONLY_SITUATIONS.has(situation)
              ? tProvider(`situations.${situation}Summary`)
              : t(target.summaryKey)}
          </p>
          {target.urgent && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              ⚡ {t("result.urgentBadge")}
            </p>
          )}
          <button
            type="button"
            onClick={findMatches}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover"
          >
            {t("result.continueCta")} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Persistent footer actions */}
      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
        {step !== 1 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" /> {t("actions.back")}
          </button>
        ) : (
          <span />
        )}

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setCoordinatorOpen(true)}
            className="text-sm font-semibold text-brand-deep hover:text-brand-deep"
          >
            {t("actions.talkToCoordinator")}
          </button>
          <span className="hidden text-slate-300 sm:inline">·</span>
          <Link
            href="/patient/nurses"
            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            {t("actions.browseAllNurses")}
          </Link>
        </div>
      </div>

      <CoordinatorPanel open={coordinatorOpen} onClose={() => setCoordinatorOpen(false)} />
    </div>
  );
}

// ---------- sub-components ----------

interface QuestionCardProps {
  index: number;
  label: string;
  help: string;
  active: boolean;
  answered: boolean;
  summary: string;
  onEdit: () => void;
  children: React.ReactNode;
}

function QuestionCard({
  index,
  label,
  help,
  active,
  answered,
  summary,
  onEdit,
  children,
}: QuestionCardProps) {
  if (answered && !active) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-start shadow-sm transition hover:border-brand-soft hover:bg-brand-soft/30"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-700">
            {index}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-0.5 truncate font-bold text-slate-800">{summary}</p>
          </div>
          <span className="text-xs font-semibold text-brand">Edit</span>
        </div>
      </button>
    );
  }

  return (
    <section className="rounded-3xl border border-brand-mist bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">
          {index}
        </span>
        <div>
          <p className="text-base font-bold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">{help}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// Resolve the user-facing label for a situation. Physio-only options
// live under the provider.findCare i18n namespace; the rest live under
// findCare.questions.situation.options to keep the original copy
// surface intact.
function situationLabel(
  opt: Situation,
  t: ReturnType<typeof useTranslations>,
  tProvider: ReturnType<typeof useTranslations>,
): string {
  if (PHYSIO_ONLY_SITUATIONS.has(opt)) {
    return tProvider(`situations.${opt}`);
  }
  return t(`questions.situation.options.${opt}`);
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-2xl border px-4 py-3 text-start text-sm font-semibold transition ${
        selected
          ? "border-brand bg-brand-soft/30 text-brand-deep shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-brand-soft hover:bg-brand-soft/20"
      }`}
    >
      {label}
    </button>
  );
}
