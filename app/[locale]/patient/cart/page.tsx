"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Plus,
  Minus,
  CheckCircle2,
  Trash2,
  ShoppingBag,
} from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import { useCart } from "@/components/patient/CartContext";
import { getProducts, createOrder } from "@/services/storeService";
import { ensureClientFirebase } from "@/lib/firebase/config";
import type { StoreItem } from "@/lib/types";
import { useState, useEffect } from "react";
import { fmtCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { tLocalized } from "@/lib/i18nContent";

export default function CartPage() {
  const { cart, removeFromCart, addToCart, removeItemCompletely, clearCart, totalItems } = useCart();
  const t = useTranslations("patient.cart");
  const locale = useLocale() as Locale;
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getProducts().then((data) => {
      if (active) {
        setProducts(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const cartItems = products
    .filter((item) => cart[item.id] > 0)
    .map((item) => ({
      ...item,
      quantity: cart[item.id],
    }));

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const total = subtotal;

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const { auth } = ensureClientFirebase();
      const currentUser = auth.currentUser;
      const patientId = currentUser?.uid ?? "guest";

      const orderItems = cartItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      const order = await createOrder({
        patientId,
        items: orderItems,
        total,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setOrderId(order.id);
      clearCart();
      setSuccess(true);
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setCheckingOut(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50 p-12 text-center shadow-sm animate-in fade-in zoom-in-95 min-h-[400px]">
        <CheckCircle2 className="mb-5 h-20 w-20 text-emerald-500" />
        <h3 className="text-3xl font-extrabold text-slate-800">{t("successTitle")}</h3>
        {orderId && (
          <p className="mt-2 text-xs font-mono text-slate-400">
            {t("successOrderNumber", { id: orderId.slice(-10).toUpperCase() })}
          </p>
        )}
        <p className="mt-4 text-slate-600 max-w-md mx-auto leading-relaxed">{t("successBody")}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/patient/store"
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            {t("continueShopping")}
          </Link>
          <Link
            href="/patient/orders"
            className="rounded-2xl bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 shadow-md transition"
          >
            {t("viewMyOrders")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-4">
        <Link
          href="/patient/store"
          className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          aria-label={t("backToStore")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{t("pageTitle")}</h1>
          <p className="text-sm text-slate-500">
            {totalItems > 0 ? t("itemsSelected", { n: totalItems }) : t("empty")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        </div>
      ) : totalItems === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
          <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-slate-200" />
          <h3 className="text-xl font-bold text-slate-700">{t("empty")}</h3>
          <p className="mt-2 text-slate-500">{t("emptyBody")}</p>
          <div className="mt-6">
            <PatientButton href="/patient/store">{t("browseStore")}</PatientButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row gap-4 items-center rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition"
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-4xl">
                  {item.image}
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-start">
                  <h4 className="font-bold text-slate-800 leading-tight">{tLocalized(item.name, locale)}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{item.category}</p>
                  <p className="mt-1.5 font-bold text-sky-600">
                    {fmtCurrency(item.price, locale)}{" "}
                    <span className="text-xs font-normal text-slate-400">{t("each")}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-50 rounded-2xl border border-slate-100 p-1">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-slate-600 hover:bg-slate-200 rounded-xl transition"
                      aria-label={t("decrease")}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-bold w-6 text-center text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(item.id)}
                      className="p-2 text-slate-600 hover:bg-slate-200 rounded-xl transition"
                      aria-label={t("increase")}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <span className="text-base font-extrabold text-slate-800 w-16 text-end">
                    {fmtCurrency(item.price * item.quantity, locale)}
                  </span>

                  <button
                    onClick={() => removeItemCompletely(item.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition"
                    aria-label={t("remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-5 pb-4 border-b border-slate-100">{t("orderSummary")}</h3>

              <div className="space-y-3 text-sm text-slate-600 mb-6">
                <div className="flex justify-between">
                  <span>{t("subtotal", { n: totalItems })}</span>
                  <span className="font-semibold text-slate-800">{fmtCurrency(subtotal, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("shipping")}</span>
                  <span className="font-semibold text-slate-500 text-xs text-end max-w-[55%]">
                    {t("shippingNote")}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
                  <span className="font-bold text-slate-800">{t("total")}</span>
                  <span className="font-extrabold text-xl text-sky-600">{fmtCurrency(total, locale)}</span>
                </div>
              </div>

              <PatientButton
                onClick={handleCheckout}
                loading={checkingOut}
                className="w-full justify-center rounded-2xl py-3.5 text-base font-bold bg-violet-600 hover:bg-violet-700 shadow-[0_8px_20px_-8px_rgba(124,58,237,0.6)]"
              >
                {t("placeOrder")}
              </PatientButton>

              <p className="mt-4 text-center text-xs text-slate-400 leading-relaxed">{t("reviewNote")}</p>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <Link
                  href="/patient/store"
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("continueShopping")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
