"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ShoppingCart,
  PackageOpen,
  Plus,
  Minus,
  Search,
  Stethoscope,
  Activity,
  HeartPulse,
  Shield,
  Accessibility,
  LayoutGrid,
} from "lucide-react";
import SectionContainer from "@/components/patient/SectionContainer";
import { useCart } from "@/components/patient/CartContext";
import { getProducts } from "@/services/storeService";
import type { StoreItem } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import { fmtCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { tLocalized } from "@/lib/i18nContent";
import StoreItemImage from "@/components/common/StoreItemImage";

// Category keys map onto stored product.category values. Display labels
// come from messages/{locale}/patient.store.categories.
// All categories share the same brand teal lockup; differentiation
// comes from the icon glyph. Pre-brand the catalogue used a rainbow
// (violet / emerald / amber / rose) per category; the v2 brand pass
// flattens that to a single visual rhythm so the store reads as one
// Care+ surface instead of six tints.
const CATEGORY_GRADIENT = "from-brand to-brand-deep";
const CATEGORY_SOFT = "from-brand-soft/40 to-brand-soft/70";
const CATEGORY_BADGE = "bg-brand-soft/40 text-brand-deep";

const CATEGORIES = [
  { key: "all", value: "all", icon: LayoutGrid, color: "from-slate-400 to-slate-500" },
  { key: "monitoring", value: "Monitoring", icon: Activity, color: CATEGORY_GRADIENT },
  { key: "equipment", value: "Equipment", icon: Stethoscope, color: CATEGORY_GRADIENT },
  { key: "recovery", value: "Recovery", icon: HeartPulse, color: CATEGORY_GRADIENT },
  { key: "elderlySupport", value: "Elderly Support", icon: Accessibility, color: CATEGORY_GRADIENT },
  { key: "masksProtection", value: "Masks & Protection", icon: Shield, color: CATEGORY_GRADIENT },
] as const;

function getCategoryColor(): string {
  return CATEGORY_SOFT;
}

function getCategoryBadgeColor(): string {
  return CATEGORY_BADGE;
}

export default function StorePage() {
  const { cart, addToCart, removeFromCart, totalItems } = useCart();
  const t = useTranslations("patient.store");
  const locale = useLocale() as Locale;
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [toastItemId, setToastItemId] = useState<string | null>(null);

  const handleAddToCart = (id: string) => {
    addToCart(id);
    setToastItemId(id);
    setTimeout(() => setToastItemId(null), 1500);
  };

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

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== "all") {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          tLocalized(p.name, locale).toLowerCase().includes(q) ||
          tLocalized(p.description, locale).toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, search, locale]);

  const sectionTitle = activeCategory === "all"
    ? t("categoryAllProducts")
    : (CATEGORIES.find((c) => c.value === activeCategory)?.key === "all"
        ? t("categoryAllProducts")
        : (() => {
            const cat = CATEGORIES.find((c) => c.value === activeCategory);
            return cat && cat.key !== "all" ? t(`categories.${cat.key}`) : activeCategory;
          })());

  const sectionDescription = loading
    ? t("loading")
    : filtered.length > 0
      ? t("productCount", { n: filtered.length })
      : t("noResults");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-deep to-brand p-6 shadow-[0_10px_40px_-20px_rgba(31,106,114,0.5)] text-white sm:p-10 flex justify-between items-center">
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold text-brand-soft uppercase tracking-wider sm:text-sm">{t("kicker")}</p>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-white/85 sm:mt-4 sm:text-base">{t("subtitle")}</p>
        </div>

        <Link
          href="/patient/cart"
          className="relative hidden md:flex flex-col items-center justify-center h-24 w-24 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 z-10 hover:bg-white/30 transition shadow-xl"
        >
          <ShoppingCart className="h-8 w-8 mb-1" />
          <span className="font-bold text-lg">{totalItems}</span>
          {totalItems > 0 && (
            <span className="absolute -top-2 -end-2 h-5 w-5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
              {totalItems}
            </span>
          )}
        </Link>

        <div className="absolute -start-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -end-10 -top-10 h-48 w-48 rounded-full bg-black/10 blur-2xl" />
      </section>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            dir="auto"
            className="w-full rounded-2xl border border-slate-200 bg-white ps-11 pe-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft/40 transition"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.value;
            const Icon = cat.icon;
            const label = cat.key === "all" ? t("categoryAll") : t(`categories.${cat.key}`);
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-slate-800 text-white shadow-md"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <SectionContainer title={sectionTitle} description={sectionDescription}>
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-soft border-t-brand" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageOpen className="h-14 w-14 text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-700">{t("noProductsTitle")}</p>
            <p className="text-sm text-slate-500 mt-1">{t("noProductsBody")}</p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("all"); }}
              className="mt-4 rounded-xl bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              {t("clearFilters")}
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const quantity = cart[item.id] || 0;
              const gradientBg = getCategoryColor();
              const badgeColor = getCategoryBadgeColor();
              return (
                <div
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:border-brand-soft hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group"
                >
                  <div
                    className={`relative flex h-40 flex-col items-center justify-center overflow-hidden bg-gradient-to-br ${gradientBg} gap-2 transition-transform duration-300`}
                  >
                    <StoreItemImage
                      src={item.image}
                      alt={tLocalized(item.name, locale)}
                      glyphSize="text-5xl group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
                        {item.category}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 leading-snug mb-1">{tLocalized(item.name, locale)}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">{tLocalized(item.description, locale)}</p>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="text-xl font-extrabold text-brand">
                        {fmtCurrency(item.price, locale)}
                      </span>

                      {quantity > 0 ? (
                        <div className="flex items-center gap-1 bg-brand-soft/30 border border-brand-mist rounded-2xl p-1">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-brand hover:bg-brand-soft/50 rounded-xl transition"
                            aria-label={t("decreaseQty")}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-bold text-brand-deep w-5 text-center text-sm">{quantity}</span>
                          <button
                            onClick={() => addToCart(item.id)}
                            className="p-1.5 text-brand hover:bg-brand-soft/50 rounded-xl transition"
                            aria-label={t("increaseQty")}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item.id)}
                          className={`rounded-2xl text-sm px-4 py-2 font-semibold transition-colors ${
                            toastItemId === item.id
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-800 text-white hover:bg-slate-700"
                          }`}
                        >
                          {toastItemId === item.id ? t("addedToCart") : t("addToCart")}
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
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-md bg-slate-800 text-white p-4 rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex items-center justify-between border border-slate-700 z-50 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3">
            <div className="bg-slate-700 p-2 rounded-2xl">
              <PackageOpen className="h-6 w-6 text-brand-soft" />
            </div>
            <div>
              <p className="font-bold">{t("itemsInCart", { n: totalItems })}</p>
              <p className="text-xs text-slate-400">{t("readyForCheckout")}</p>
            </div>
          </div>
          <Link
            href="/patient/cart"
            className="bg-brand hover:bg-brand-hover transition px-6 py-2.5 rounded-2xl font-bold text-sm shadow-md"
          >
            {t("checkout")}
          </Link>
        </div>
      )}
    </div>
  );
}
