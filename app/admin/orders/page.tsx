"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Package, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { StoreOrder, StoreItem } from "@/lib/types";
import { getOrders, getProducts } from "@/services/storeService";
import { doc, updateDoc } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import LoadingScreen from "@/components/common/LoadingScreen";

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

function OrderCard({
  order,
  products,
  onStatusChange,
}: {
  order: StoreOrder;
  products: StoreItem[];
  onStatusChange: (id: string, status: StoreOrder["status"]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  function getProductName(id: string) {
    return products.find((p) => p.id === id)?.name ?? id;
  }

  async function handleStatusChange(newStatus: StoreOrder["status"]) {
    setUpdating(true);
    try {
      const { db } = ensureClientFirebase();
      await updateDoc(doc(db, "orders", order.id), { status: newStatus });
      onStatusChange(order.id, newStatus);
    } catch (err) {
      console.error("Failed to update order status", err);
    } finally {
      setUpdating(false);
    }
  }

  const nextStatuses = STATUS_TRANSITIONS[order.status];

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-sky-200 transition-all overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-start justify-between gap-4 p-6 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100">
            <Package className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg">
              Order #{order.id.slice(-8).toUpperCase()}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              Patient ID:{" "}
              <span className="font-semibold text-slate-600">{order.patientId.slice(0, 12)}…</span>
              {" · "}
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{order.items.length} item(s)</p>
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
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-6 space-y-4">
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
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
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
                    onClick={(e) => {
                      e.stopPropagation();
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

export default function AdminOrdersPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StoreOrder["status"] | "all">("all");

  useEffect(() => {
    let active = true;
    async function load() {
      const [ordersData, productsData] = await Promise.all([getOrders(), getProducts()]);
      if (active) {
        setOrders(ordersData);
        setProducts(productsData);
        setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  function handleStatusChange(id: string, status: StoreOrder["status"]) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  if (authLoading || !appUser || loading) return <LoadingScreen text="Loading orders..." />;

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
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Orders</h1>
          <p className="text-slate-500 mt-1">Track and manage all medical store purchases.</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 px-5 py-2.5 text-center shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Orders
          </p>
          <p className="text-2xl font-extrabold text-slate-800">{orders.length}</p>
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
