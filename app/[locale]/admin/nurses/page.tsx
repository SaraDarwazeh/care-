"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, FileText, CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { AppUser, NurseProfile } from "@/lib/types";
import { changeNurseStatus, fetchNurses } from "@/services/adminService";
import { getNurseProfileByUserId } from "@/services/nurseService";
import { getErrorMessage } from "@/services/errorService";

function NurseRow({
  nurse,
  onStatusChange,
  busyId,
}: {
  nurse: AppUser;
  onStatusChange: (id: string, status: "approved" | "rejected") => void;
  busyId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<NurseProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const t = useTranslations("admin.nurses");
  const tStatus = useTranslations("admin.nurses.status");

  async function handleExpand() {
    if (!expanded && !profile) {
      setLoadingProfile(true);
      try {
        const p = await getNurseProfileByUserId(nurse.id);
        setProfile(p);
      } finally {
        setLoadingProfile(false);
      }
    }
    setExpanded(!expanded);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:border-sky-300">
      <div className="flex items-center justify-between p-6 bg-white cursor-pointer hover:bg-slate-50" onClick={handleExpand}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-xl font-bold text-sky-700">
            {nurse.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg">{nurse.name}</p>
            <p className="text-sm text-slate-500">{nurse.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {nurse.status === "pending" && nurse.approvedAt && (
            <span className="rounded-xl bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
              {t("resubmittedBadge")}
            </span>
          )}
          <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wide ${
            nurse.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
            nurse.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {tStatus(nurse.status)}
          </span>
          <div className="text-slate-400">
            {expanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-6 bg-slate-50">
          {loadingProfile ? (
            <p className="text-sm text-slate-500 font-medium">{t("loadingProfile")}</p>
          ) : profile ? (
            <div className="space-y-6 text-sm">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="font-semibold text-slate-400 uppercase tracking-wider text-xs mb-1">{t("specialization")}</p>
                  <p className="font-bold text-slate-700 text-base">{profile.specialization}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="font-semibold text-slate-400 uppercase tracking-wider text-xs mb-1">{t("experience")}</p>
                  <p className="font-bold text-slate-700 text-base">{t("experienceYears", { years: profile.experienceYears })}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="font-semibold text-slate-400 uppercase tracking-wider text-xs mb-2">{t("professionalBio")}</p>
                <p className="text-slate-600 leading-relaxed">{profile.bio}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="font-semibold text-slate-400 uppercase tracking-wider text-xs mb-2">{t("perShiftPricing")}</p>
                {profile.pricePerShift && Object.values(profile.pricePerShift).some((n) => typeof n === "number" && n > 0) ? (
                  <ul className="flex flex-wrap gap-2 text-xs">
                    {(["A", "B", "C"] as const).map((shift) => {
                      const v = profile.pricePerShift?.[shift];
                      if (typeof v !== "number" || v <= 0) return null;
                      return (
                        <li
                          key={shift}
                          className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700"
                        >
                          {shift}: {v}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs font-bold text-amber-700">⚠ {t("perShiftPricingMissing")}</p>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="font-semibold text-slate-400 uppercase tracking-wider text-xs mb-3">{t("certificates")}</p>
                {(!profile.certificates || profile.certificates.length === 0) ? (
                  <p className="text-slate-500 font-medium">{t("noCertificates")}</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {profile.certificates.map((cert) => (
                      <li key={cert.id} className="flex items-center gap-2 text-sky-700 bg-sky-50 px-4 py-2 rounded-xl font-bold border border-sky-100 transition hover:bg-sky-100">
                        <FileText className="h-4 w-4" />
                        {cert.url ? (
                          <a href={cert.url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                            {cert.name}
                          </a>
                        ) : (
                          <span>{cert.name} <span className="ms-1 text-xs italic text-amber-700">{t("legacyCert")}</span></span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-800 font-medium text-sm">
              {t("noProfile")}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => onStatusChange(nurse.id, "approved")}
              disabled={busyId === nurse.id + "approved"}
              className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/20"
            >
              <CheckCircle className="h-5 w-5" /> {t("approve")}
            </button>
            <button
              onClick={() => onStatusChange(nurse.id, "rejected")}
              disabled={busyId === nurse.id + "rejected"}
              className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-rose-100 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-200 disabled:opacity-50"
            >
              <XCircle className="h-5 w-5" /> {t("reject")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminNursesPage() {
  const { appUser, loading } = useProtectedRoute({
    allowedRoles: ["admin"],
  });
  const t = useTranslations("admin.nurses");

  const [nurses, setNurses] = useState<AppUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadNurses() {
    try {
      const list = await fetchNurses();
      setNurses(list);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  // Gated on appUser — fetchNurses() requires a Firebase ID token, and
  // `auth.currentUser` is still null on first render. Without this gate
  // the request fires before token restore and adminService throws
  // "You must be signed in to perform this action."
  useEffect(() => {
    if (!appUser) return;
    let active = true;
    async function initNurses() {
      try {
        const list = await fetchNurses();
        if (active) setNurses(list);
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError));
      } finally {
        if (active) setFetching(false);
      }
    }
    void initNurses();
    return () => { active = false; };
  }, [appUser]);

  async function onChangeStatus(id: string, status: "approved" | "rejected") {
    setActionLoadingId(id + status);
    setError("");
    setFetching(true);
    try {
      await changeNurseStatus({ id, status });
      await loadNurses();
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setFetching(false);
      setActionLoadingId(null);
    }
  }

  if (loading || !appUser) {
    return <LoadingScreen text={t("loading")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{t("title")}</h1>
          <p className="text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
        {fetching && <p className="text-sm font-medium text-slate-500 mb-4 animate-pulse">{t("syncing")}</p>}
        {error && <p className="mb-6 text-sm font-bold text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-100">{error}</p>}

        {!fetching && nurses.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-700">{t("allCaughtUp")}</p>
            <p className="text-slate-500">{t("noNurses")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {nurses.map((nurse) => (
              <NurseRow 
                key={nurse.id} 
                nurse={nurse} 
                onStatusChange={onChangeStatus} 
                busyId={actionLoadingId} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
