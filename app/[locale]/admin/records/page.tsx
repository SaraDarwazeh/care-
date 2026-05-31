"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import {
  ClipboardList,
  FileText,
  Search,
  ChevronRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  PencilLine,
} from "lucide-react";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import LoadingScreen from "@/components/common/LoadingScreen";
import { MedicalRecord, MedicalRecordStatus } from "@/lib/types";
import { recordStatus } from "@/services/medicalService";

interface EnrichedRecord extends MedicalRecord {
  patientName: string;
  patientEmail: string;
  nurseName: string;
  observationCount: number;
}

type StatusFilter = "all" | MedicalRecordStatus;

const STATUS_OPTIONS: { id: StatusFilter; label: string; icon: typeof FileText }[] = [
  { id: "all", label: "All", icon: ClipboardList },
  { id: "draft", label: "Draft", icon: PencilLine },
  { id: "submitted", label: "Awaiting confirmation", icon: Clock },
  { id: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { id: "disputed", label: "Disputed", icon: ShieldAlert },
];

const STATUS_STYLES: Record<MedicalRecordStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  disputed: "bg-rose-100 text-rose-800",
};

async function enrichRecord(
  raw: MedicalRecord,
): Promise<EnrichedRecord> {
  const { db } = ensureClientFirebase();
  // Pull patient + nurse names + an observation count snapshot. The
  // subcollection size query is the lightest "how busy was this visit?"
  // signal we can show in an index.
  const [patientSnap, nurseSnap, obsSnap] = await Promise.all([
    raw.patientId ? getDoc(doc(db, "users", raw.patientId)) : Promise.resolve(null),
    raw.nurseId ? getDoc(doc(db, "nurseProfiles", raw.nurseId)) : Promise.resolve(null),
    getDocs(collection(db, `medicalRecords/${raw.id}/observations`)),
  ]);

  const patientData = patientSnap?.exists() ? (patientSnap.data() as Record<string, unknown>) : null;
  const nurseData = nurseSnap?.exists() ? (nurseSnap.data() as Record<string, unknown>) : null;

  return {
    ...raw,
    patientName: String(patientData?.name ?? "Unknown patient"),
    patientEmail: String(patientData?.email ?? ""),
    nurseName: String(nurseData?.fullName ?? "Unknown nurse"),
    observationCount: obsSnap.size,
  };
}

function AdminRecordsPageInner() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const t = useTranslations("admin.records");
  const tOrders = useTranslations("admin.orders");
  const searchParams = useSearchParams();
  const initialStatus =
    (searchParams.get("status") as StatusFilter | null) &&
    STATUS_OPTIONS.some((o) => o.id === (searchParams.get("status") as StatusFilter))
      ? (searchParams.get("status") as StatusFilter)
      : "all";

  const [records, setRecords] = useState<EnrichedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);

  // Gated on appUser so Firestore reads don't fire before auth restores.
  useEffect(() => {
    if (!appUser) return;
    let active = true;
    (async () => {
      try {
        const { db } = ensureClientFirebase();
        const snap = await getDocs(collection(db, "medicalRecords"));
        const raws: MedicalRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MedicalRecord, "id">),
        }));
        const enriched = await Promise.all(raws.map(enrichRecord));
        if (!active) return;
        // Newest-first by createdAt; disputed pages sort by disputedAt later
        // when the user pivots filters.
        enriched.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        setRecords(enriched);
      } catch (err) {
        console.error("[admin/records] load failed", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [appUser]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== "all" && recordStatus(r) !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.patientName} ${r.nurseName} ${r.summary ?? ""} ${r.disputeNote ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: records.length,
      draft: 0,
      submitted: 0,
      confirmed: 0,
      disputed: 0,
    };
    for (const r of records) {
      c[recordStatus(r)]++;
    }
    return c;
  }, [records]);

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text={t("loading")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 px-5 py-2.5 text-center shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{tOrders("filterAll")}</p>
          <p className="text-2xl font-extrabold text-slate-800">{records.length}</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="rounded-3xl bg-white p-3 shadow-sm border border-slate-200 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = statusFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStatusFilter(opt.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                active
                  ? opt.id === "disputed"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-sky-500 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[opt.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient, nurse, summary, or dispute note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 ps-9 pe-3 text-sm focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
          <ClipboardList className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">No records match this filter</p>
          <p className="text-sm text-slate-500">
            {statusFilter === "disputed"
              ? "Nothing is currently disputed — great place to be."
              : "Try a different filter or clear the search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const status = recordStatus(record);
            return (
              <Link
                key={record.id}
                href={`/patient/records/${record.id}`}
                className="group block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-800">
                        {record.summary ?? "Visit record"}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[status]}`}
                      >
                        {status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {record.observationCount} obs
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold text-slate-700">{record.patientName}</span>
                      {record.patientEmail && (
                        <span className="ms-1 text-slate-400">· {record.patientEmail}</span>
                      )}
                      <span className="ms-1 text-slate-400">·</span>
                      <span className="ms-1">{record.nurseName}</span>
                    </p>
                    {status === "disputed" && record.disputeNote && (
                      <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Dispute note —{" "}
                        </span>
                        {record.disputeNote}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-400">
                      Created {record.createdAt ? new Date(record.createdAt).toLocaleString() : "—"}
                      {record.disputedAt && (
                        <span className="ms-2 text-rose-600/80">
                          · Disputed {new Date(record.disputedAt).toLocaleString()}
                        </span>
                      )}
                      {record.confirmedAt && status === "confirmed" && (
                        <span className="ms-2 text-emerald-700/80">
                          · Confirmed {new Date(record.confirmedAt).toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 self-center text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminRecordsPage() {
  return (
    <Suspense fallback={<LoadingScreen text="Loading…" />}>
      <AdminRecordsPageInner />
    </Suspense>
  );
}
