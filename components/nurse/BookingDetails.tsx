"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { BookingWithParticipants, MedicalRecord } from "@/lib/types";
import PriceBreakdown from "@/components/common/PriceBreakdown";
import { getRecordsForPatient } from "@/services/medicalService";
import { fmtDateTime } from "@/lib/format";
import type { Locale } from "@/i18n/config";

export default function BookingDetails({ booking }: { booking: BookingWithParticipants }) {
  const t = useTranslations("nurse.bookings.details");
  const locale = useLocale() as Locale;
  const [records, setRecords] = useState<MedicalRecord[]>([]);

  useEffect(() => {
    let active = true;
    async function loadRecords() {
      try {
        const r = await getRecordsForPatient(booking.patientId);
        if (!active) return;
        setRecords(r.slice(0, 3));
      } catch (err) { console.error(err); }
    }
    void loadRecords();
    return () => { active = false; };
  }, [booking.patientId]);

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
      <h4 className="font-bold">{t("title")}</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="text-sm text-slate-600">
          <div><strong>{t("patient")}</strong> {booking.patientName}</div>
          <div><strong>{t("service")}</strong> {booking.service}</div>
          <div><strong>{t("date")}</strong> {booking.date} {booking.time}</div>
          <div><strong>{t("location")}</strong> {booking.location}</div>
        </div>
        <div>
          <div className="text-sm text-slate-600 mb-2"><strong>{t("pricing")}</strong></div>
          <PriceBreakdown pricing={booking.pricing} />
        </div>
      </div>

      <div>
        <h5 className="font-semibold">{t("recentRecords")}</h5>
        {records.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noRecords")}</p>
        ) : (
          records.map((r) => (
            <div key={r.id} className="mt-2 rounded-lg border border-slate-100 p-2 bg-slate-50">
              <div className="text-sm font-semibold">{r.summary ?? t("recordFallback")}</div>
              <div className="text-xs text-slate-500">{fmtDateTime(r.createdAt, locale)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
