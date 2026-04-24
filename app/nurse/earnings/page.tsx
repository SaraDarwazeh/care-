"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, CheckCircle, Calendar } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { BookingWithParticipants } from "@/lib/types";
import { getBookingsForNurseWithParticipants } from "@/services/bookingService";
import LoadingScreen from "@/components/common/LoadingScreen";

export default function NurseEarningsPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["nurse"], requireApprovedNurse: true });
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) return;
    let active = true;
    getBookingsForNurseWithParticipants(appUser.id).then(data => {
      if (active) { setBookings(data); setLoading(false); }
    });
    return () => { active = false; };
  }, [appUser]);

  if (authLoading || !appUser || loading) return <LoadingScreen text="Loading earnings..." />;

  const completed = bookings.filter(b => b.status === "completed");
  const accepted = bookings.filter(b => b.status === "accepted");
  const total = completed.reduce((acc, b) => acc + b.price, 0);
  const pending = accepted.reduce((acc, b) => acc + b.price, 0);
  const thisMonth = completed.filter(b => b.date?.startsWith(new Date().toISOString().slice(0, 7)));
  const monthTotal = thisMonth.reduce((acc, b) => acc + b.price, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Earnings</h1>
        <p className="text-slate-500 mt-1">Your income summary from completed care sessions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
              <DollarSign className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-emerald-100 uppercase tracking-wider">Total Earned</p>
          </div>
          <p className="text-4xl font-extrabold">${total.toFixed(2)}</p>
          <p className="text-emerald-200 text-sm mt-1">{completed.length} completed sessions</p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100">
              <TrendingUp className="h-6 w-6 text-sky-600" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">This Month</p>
          </div>
          <p className="text-4xl font-extrabold text-slate-800">${monthTotal.toFixed(2)}</p>
          <p className="text-slate-400 text-sm mt-1">{thisMonth.length} sessions</p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
              <Calendar className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Upcoming</p>
          </div>
          <p className="text-4xl font-extrabold text-slate-800">${pending.toFixed(2)}</p>
          <p className="text-slate-400 text-sm mt-1">{accepted.length} confirmed shifts</p>
        </div>
      </div>

      {/* Completed Bookings Table */}
      <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          <h2 className="font-bold text-slate-800">Completed Sessions</h2>
        </div>

        {completed.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <DollarSign className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-600">No completed sessions yet</p>
            <p className="text-slate-400 text-sm">Earnings appear once bookings are marked complete.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Patient", "Service", "Date", "Earned"].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completed.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{b.patientName}</p>
                      <p className="text-xs text-slate-400">{b.location}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{b.service}</td>
                    <td className="px-6 py-4 text-slate-600">{b.date}</td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-emerald-700 text-base">${b.price.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                  <td colSpan={3} className="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider text-sm">Total Earnings</td>
                  <td className="px-6 py-4 font-extrabold text-emerald-700 text-xl">${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
