"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import type { StoreOrder, StoreItem } from "@/lib/types";
import { getOrdersForPatient, getProducts } from "@/services/storeService";
import LoadingScreen from "@/components/common/LoadingScreen";
import BackLink from "@/components/common/BackLink";
import PatientButton from "@/components/patient/PatientButton";
import { fmtCurrency, fmtDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { tLocalized } from "@/lib/i18nContent";

const ORDER_STATUS_COLORS: Record<StoreOrder["status"], string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-sky-100 text-sky-700 border-sky-200",
  shipped: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_FLOW: StoreOrder["status"][] = ["pending", "processing", "shipped", "delivered"];

const STATUS_ICONS: Record<StoreOrder["status"], React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: PackageCheck,
};

function StatusTimeline({ current }: { current: StoreOrder["status"] }) {
  const t = useTranslations("patient.orders");
  const currentIndex = STATUS_FLOW.indexOf(current);

  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{t("orderProgress")}</p>
      <ol className="grid grid-cols-4 gap-2">
        {STATUS_FLOW.map((step, index) => {
          const reached = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = STATUS_ICONS[step];
          return (
            <li key={step} className="flex flex-col items-center text-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  isCurrent
                    ? "bg-sky-500 border-sky-500 text-white shadow-sm"
                    : reached
                    ? "bg-sky-100 border-sky-200 text-sky-700"
                    : "bg-white border-slate-200 text-slate-300"
                }`}
              >
                {reached && !isCurrent ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`text-[11px] font-bold leading-tight ${
                  isCurrent
                    ? "text-sky-700"
                    : reached
                    ? "text-slate-700"
                    : "text-slate-400"
                }`}
              >
                {t(`statusFlow.${step}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function OrderCard({
  order,
  products,
}: {
  order: StoreOrder;
  products: StoreItem[];
}) {
  const t = useTranslations("patient.orders");
  const tStatus = useTranslations("patient.orderStatus");
  const locale = useLocale() as Locale;
  const [expanded, setExpanded] = useState(false);

  function getProductName(id: string) {
    const p = products.find((p) => p.id === id);
    return p ? tLocalized(p.name, locale) : id;
  }

  const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

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
          <div>
            <p className="font-bold text-slate-800 text-lg">
              {t("orderNumber", { id: order.id.slice(-8).toUpperCase() })}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {fmtDate(order.createdAt, locale, { year: "numeric", month: "short", day: "numeric" })}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{t("items", { n: itemCount })}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${ORDER_STATUS_COLORS[order.status]}`}
          >
            {tStatus(order.status)}
          </span>
          <p className="text-xl font-extrabold text-slate-800">
            {fmtCurrency(order.total, locale)}
          </p>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-6 space-y-4">
          <StatusTimeline current={order.status} />

          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t("itemsHeader")}</p>
            <div className="divide-y divide-slate-50">
              {order.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-medium text-slate-700">{getProductName(item.productId)}</span>
                  <div className="flex items-center gap-4 text-slate-500">
                    <span>{t("qty", { n: item.quantity })}</span>
                    <span className="font-bold text-slate-800">{fmtCurrency(item.price * item.quantity, locale)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {order.status === "pending" && (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
              {t("pendingNote")}
            </p>
          )}
          {order.status === "delivered" && (
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
              {t("deliveredNote")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PatientOrdersPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({
    allowedRoles: ["patient"],
  });
  const t = useTranslations("patient.orders");
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) return;
    let active = true;
    async function load() {
      if (!appUser) return;
      const [ordersData, productsData] = await Promise.all([
        getOrdersForPatient(appUser.id),
        getProducts(),
      ]);
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
  }, [appUser]);

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text={t("loading")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <BackLink href="/patient" labelKey="common.actions.backToDashboard" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("pageTitle")}</h1>
          <p className="text-slate-500 mt-1">{t("pageSubtitle")}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 px-5 py-2.5 text-center shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("totalOrders")}</p>
          <p className="text-2xl font-extrabold text-slate-800">{orders.length}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 px-6 text-center">
          <ShoppingBag className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">{t("empty")}</p>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">{t("emptyBody")}</p>
          <div className="mt-6">
            <PatientButton href="/patient/store">{t("browseStore")}</PatientButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} products={products} />
          ))}
        </div>
      )}
    </div>
  );
}
