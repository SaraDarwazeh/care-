"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Package } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { StoreOrder } from "@/lib/types";
import { getOrders } from "@/services/storeService";
import { getProducts } from "@/services/storeService";
import { StoreItem } from "@/lib/types";
import LoadingScreen from "@/components/common/LoadingScreen";

const ORDER_STATUS_COLORS: Record<StoreOrder["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-sky-100 text-sky-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
};

export default function AdminOrdersPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    return () => { active = false; };
  }, []);

  if (authLoading || !appUser || loading) return <LoadingScreen text="Loading orders..." />;

  function getProductName(id: string) {
    return products.find((p) => p.id === id)?.name ?? id;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Orders</h1>
          <p className="text-slate-500 mt-1">Track all medical store purchases.</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 px-5 py-2.5 text-center shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-2xl font-extrabold text-slate-800">{orders.length}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-20">
          <ShoppingBag className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">No orders yet</p>
          <p className="text-slate-500 text-sm">Orders will appear here when patients check out from the store.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 hover:border-sky-200 transition">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-5 w-5 text-slate-400" />
                    <p className="font-bold text-slate-800 text-lg">Order #{order.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    Patient ID: <span className="font-semibold text-slate-600">{order.patientId}</span>
                    {" · "}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${ORDER_STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                  <p className="text-xl font-extrabold text-slate-800">${order.total.toFixed(2)}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Items</p>
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{getProductName(item.productId)}</span>
                      <div className="flex items-center gap-4 text-slate-500">
                        <span>Qty: {item.quantity}</span>
                        <span className="font-bold text-slate-800">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
