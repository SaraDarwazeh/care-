"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ShoppingCart, PackageOpen, Plus, Minus } from "lucide-react";
import SectionContainer from "@/components/patient/SectionContainer";
import { useCart } from "@/components/patient/CartContext";
import { getProducts } from "@/services/storeService";
import type { StoreItem } from "@/lib/types";
import { useEffect, useState } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { fmtCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { tLocalized } from "@/lib/i18nContent";
import StoreItemImage from "@/components/common/StoreItemImage";

export default function NurseStorePage() {
  useProtectedRoute({ allowedRoles: ["nurse"], requireApprovedNurse: true });
  const t = useTranslations("nurse.store");
  const locale = useLocale() as Locale;
  const { cart, addToCart, removeFromCart, totalItems } = useCart();
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getProducts().then(data => { if (active) { setProducts(data); setLoading(false); } });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 p-8 text-white shadow-lg flex justify-between items-center">
        <div className="relative z-10">
          <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest">{t("kicker")}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-3 text-emerald-100 max-w-md">{t("subtitle")}</p>
        </div>
        <Link href="/patient/cart" className="hidden md:flex flex-col items-center justify-center h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 transition">
          <ShoppingCart className="h-7 w-7 mb-1" />
          <span className="font-bold">{totalItems}</span>
        </Link>
        <div className="absolute -start-10 -bottom-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      </section>

      <SectionContainer title={t("sectionTitle")} description={t("sectionDescription")}>
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map(item => {
              const qty = cart[item.id] || 0;
              return (
                <div key={item.id} className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:border-emerald-300 hover:shadow-lg transition group">
                  <div className="relative flex h-36 items-center justify-center overflow-hidden bg-slate-50 border-b border-slate-100">
                    <StoreItemImage
                      src={item.image}
                      alt={tLocalized(item.name, locale)}
                      glyphSize="text-6xl group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-800 leading-tight">{tLocalized(item.name, locale)}</p>
                      <p className="font-bold text-emerald-700 shrink-0">{fmtCurrency(item.price, locale)}</p>
                    </div>
                    <p className="text-xs text-slate-400 font-semibold uppercase mb-2">{item.category}</p>
                    <p className="mb-4 text-xs text-slate-500 line-clamp-2">{tLocalized(item.description, locale)}</p>
                    <div className="mt-auto pt-4 border-t border-slate-100">
                      {qty > 0 ? (
                        <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-1">
                          <button onClick={() => removeFromCart(item.id)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition">
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="font-bold text-emerald-800">{qty}</span>
                          <button onClick={() => addToCart(item.id)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(item.id)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-emerald-600 transition">
                          <Plus className="h-4 w-4" /> {t("addToCart")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionContainer>

      {totalItems > 0 && (
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-md bg-slate-800 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between border border-slate-700 z-50 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3">
            <div className="bg-slate-700 p-2 rounded-2xl">
              <PackageOpen className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <p className="font-bold">{t("itemsInCart", { n: totalItems })}</p>
              <p className="text-xs text-slate-400">{t("readyForCheckout")}</p>
            </div>
          </div>
          <Link href="/patient/cart" className="bg-emerald-500 hover:bg-emerald-600 transition px-6 py-2.5 rounded-2xl font-bold text-sm shadow-md">
            {t("checkout")}
          </Link>
        </div>
      )}
    </div>
  );
}
