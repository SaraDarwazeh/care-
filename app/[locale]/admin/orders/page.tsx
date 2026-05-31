"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingBag,
  Package,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  CircleDot,
  Circle,
} from "lucide-react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { StoreOrder, StoreItem, PatientProfile } from "@/lib/types";
import { updateOrderStatus } from "@/services/storeService";
import { getPatientLocations } from "@/services/patientService";
import LoadingScreen from "@/components/common/LoadingScreen";
import { downloadCsv, timestampedFilename, type CsvColumn } from "@/lib/csvExport";
import { tLocalized } from "@/lib/i18nContent";

const ORDER_STATUS_COLORS: Record<StoreOrder["status"], string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-sky-100 text-sky-700 border-sky-200",
  shipped: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_TRANSITIONS: Record<StoreOrder["status"], StoreOrder["status"][]> = {
  pending: ["processing", "delivered"],
  processing: ["shipped", "delivered"],
  shipped: ["delivered"],
  delivered: [],
};

const LIFECYCLE_ORDER: StoreOrder["status"][] = ["pending", "processing", "shipped", "delivered"];

interface PatientSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  defaultLocation: string;
  allLocations: string;
}

interface EnrichedOrder extends StoreOrder {
  patient: PatientSummary | null;
}

function StatusLifecycle({ current }: { current: StoreOrder["status"] }) {
  const currentIdx = LIFECYCLE_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {LIFECYCLE_ORDER.map((step, idx) => {
        const reached = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = reached ? (isCurrent ? CircleDot : CheckCircle2) : Circle;
        return (
          <div key={step} className="flex items-center gap-1.5">
            <Icon
              className={`h-3.5 w-3.5 ${
                reached ? "text-emerald-600" : "text-slate-300"
              } ${isCurrent ? "text-sky-600" : ""}`}
            />
            <span
              className={`font-semibold capitalize ${
                isCurrent ? "text-sky-700" : reached ? "text-emerald-700" : "text-slate-400"
              }`}
            >
              {step}
            </span>
            {idx < LIFECYCLE_ORDER.length - 1 && (
              <span className={`h-px w-4 ${reached ? "bg-emerald-300" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({
  order,
  products,
  onStatusChange,
}: {
  order: EnrichedOrder;
  products: StoreItem[];
  onStatusChange: (id: string, status: StoreOrder["status"]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  function getProductName(id: string) {
    const p = products.find((p) => p.id === id);
    return p ? tLocalized(p.name, "en") : id;
  }

  async function handleStatusChange(newStatus: StoreOrder["status"]) {
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      onStatusChange(order.id, newStatus);
    } catch (err) {
      console.error("Failed to update order status", err);
    } finally {
      setUpdating(false);
    }
  }

  const nextStatuses = STATUS_TRANSITIONS[order.status];
  const patient = order.patient;

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-sky-200 transition-all overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-4 p-6 text-start hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100">
            <Package className="h-5 w-5 text-sky-600" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 text-lg">
              Order #{order.id.slice(-8).toUpperCase()}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700">
              {patient?.name || "Unknown patient"}
            </p>
            <p className="text-xs text-slate-500">
              {patient?.email || order.patientId}
              {patient?.phone ? ` · ${patient.phone}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {new Date(order.createdAt).toLocaleString()} · {order.items.length} item(s)
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${ORDER_STATUS_COLORS[order.status]}`}
          >
            {order.status}
          </span>
          <p className="text-xl font-extrabold text-slate-800">${order.total.toFixed(2)}</p>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-6 space-y-4">
          {/* Lifecycle */}
          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Fulfillment lifecycle
            </p>
            <StatusLifecycle current={order.status} />
          </div>

          {/* Patient + delivery */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white border border-slate-100 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Patient contact
              </p>
              {patient ? (
                <div className="space-y-1.5 text-sm">
                  <p className="font-bold text-slate-800">{patient.name}</p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> {patient.email || "—"}
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {patient.phone || "—"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Patient record not available.</p>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Delivery address
              </p>
              {patient?.defaultLocation ? (
                <>
                  <p className="flex items-start gap-1.5 text-sm font-semibold text-slate-700">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {patient.defaultLocation}
                  </p>
                  {patient.allLocations && patient.allLocations !== patient.defaultLocation && (
                    <p className="mt-2 text-xs text-slate-500">
                      Other saved addresses: {patient.allLocations}
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-slate-400">
                    Pulled from patient&rsquo;s default profile address. Confirm with the patient before dispatch.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">No address on file. Contact the patient before fulfilling.</p>
              )}
            </div>
          </div>

          {/* Items list */}
          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Items</p>
            <div className="divide-y divide-slate-50">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-slate-700">{getProductName(item.productId)}</span>
                  <div className="flex items-center gap-4 text-slate-500">
                    <span>Qty: {item.quantity}</span>
                    <span className="font-bold text-slate-800">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status update buttons */}
          {nextStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider me-1">
                Update status:
              </span>
              {nextStatuses.map((status) => {
                const colorMap: Record<StoreOrder["status"], string> = {
                  pending: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
                  processing: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
                  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
                  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
                };
                return (
                  <button
                    key={status}
                    disabled={updating}
                    onClick={() => {
                      void handleStatusChange(status);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed capitalize ${colorMap[status]}`}
                  >
                    {updating && <RefreshCw className="h-3 w-3 animate-spin" />}
                    Mark as {status}
                  </button>
                );
              })}
            </div>
          )}

          {order.status === "delivered" && (
            <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
              This order has been delivered.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

async function enrichOrders(orders: StoreOrder[]): Promise<EnrichedOrder[]> {
  const { db } = ensureClientFirebase();
  const uniquePatientIds = Array.from(new Set(orders.map((o) => o.patientId).filter(Boolean)));
  const patientMap = new Map<string, PatientSummary>();

  await Promise.all(
    uniquePatientIds.map(async (pid) => {
      const [userSnap, profileSnap] = await Promise.all([
        getDoc(doc(db, "users", pid)),
        getDoc(doc(db, "patientProfiles", pid)),
      ]);
      const userData = userSnap.exists() ? (userSnap.data() as Record<string, unknown>) : null;
      const profile = profileSnap.exists() ? (profileSnap.data() as PatientProfile) : null;
      const locations = profile ? getPatientLocations(profile) : [];
      patientMap.set(pid, {
        id: pid,
        name: String(userData?.name ?? "Unknown patient"),
        email: String(userData?.email ?? ""),
        phone: String(profile?.phone ?? ""),
        defaultLocation: profile?.defaultLocation ?? locations.find((l) => l.isDefault)?.address ?? "",
        allLocations: locations.map((l) => `${l.label}: ${l.address}`).join("; "),
      });
    }),
  );

  return orders.map((order) => ({
    ...order,
    patient: patientMap.get(order.patientId) ?? null,
  }));
}

export default function AdminOrdersPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const t = useTranslations("admin.orders");
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StoreOrder["status"] | "all">("all");

  // Gated on appUser so Firestore reads don't fire before auth restores.
  useEffect(() => {
    if (!appUser) return;
    let active = true;
    const { db } = ensureClientFirebase();

    Promise.all([
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "products")),
    ])
      .then(async ([ordersSnap, productsSnap]) => {
        const rawOrders = ordersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoreOrder, "id">) }));
        const enriched = await enrichOrders(rawOrders);
        if (!active) return;
        setOrders(enriched);
        setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoreItem, "id">) })));
      })
      .catch((err) => console.error("[admin/orders] load failed", err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appUser]);

  function handleStatusChange(id: string, status: StoreOrder["status"]) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  function exportOrdersCsv() {
    const columns: CsvColumn<EnrichedOrder>[] = [
      { header: "Order ID", accessor: (o) => o.id },
      { header: "Created at", accessor: (o) => o.createdAt },
      { header: "Status", accessor: (o) => o.status },
      { header: "Patient name", accessor: (o) => o.patient?.name ?? "" },
      { header: "Patient email", accessor: (o) => o.patient?.email ?? "" },
      { header: "Patient phone", accessor: (o) => o.patient?.phone ?? "" },
      { header: "Delivery address", accessor: (o) => o.patient?.defaultLocation ?? "" },
      { header: "Item count", accessor: (o) => o.items.length },
      {
        header: "Items (EN)",
        accessor: (o) =>
          o.items
            .map((it) => {
              const prod = products.find((p) => p.id === it.productId);
              const name = prod ? tLocalized(prod.name, "en") : it.productId;
              return `${name} × ${it.quantity} @ $${it.price}`;
            })
            .join(" | "),
      },
      {
        header: "Items (AR)",
        accessor: (o) =>
          o.items
            .map((it) => {
              const prod = products.find((p) => p.id === it.productId);
              const name = prod ? (prod.name.ar ?? "") : "";
              return name ? `${name} × ${it.quantity}` : "";
            })
            .filter(Boolean)
            .join(" | "),
      },
      { header: "Total", accessor: (o) => o.total.toFixed(2) },
    ];
    downloadCsv(timestampedFilename("careplus-orders"), filtered, columns);
  }

  if (authLoading || !appUser || loading) return <LoadingScreen text={t("loading")} />;

  const statusOptions: Array<StoreOrder["status"] | "all"> = [
    "all",
    "pending",
    "processing",
    "shipped",
    "delivered",
  ];

  const filtered =
    statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

  const counts: Record<string, number> = { all: orders.length };
  for (const s of ["pending", "processing", "shipped", "delivered"] as StoreOrder["status"][]) {
    counts[s] = orders.filter((o) => o.status === s).length;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white border border-slate-200 px-5 py-2.5 text-center shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("filterAll")}</p>
            <p className="text-2xl font-extrabold text-slate-800">{orders.length}</p>
          </div>
          <button
            type="button"
            onClick={exportOrdersCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-sky-500/20 transition hover:bg-sky-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {t("exportCsv")}
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="rounded-3xl bg-white p-3 shadow-sm border border-slate-200 flex flex-wrap gap-2">
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
              statusFilter === s
                ? "bg-sky-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {s === "all" ? "All" : s}
            <span
              className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                statusFilter === s ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-20">
          <ShoppingBag className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">No orders found</p>
          <p className="text-slate-500 text-sm mt-1">
            {statusFilter === "all"
              ? "Orders will appear here when patients check out."
              : `No ${statusFilter} orders at the moment.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              products={products}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
