"use client";

import Link from "next/link";
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
  BriefcaseMedical,
  LayoutGrid,
} from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import SectionContainer from "@/components/patient/SectionContainer";
import { useCart } from "@/components/patient/CartContext";
import { getProducts } from "@/services/storeService";
import { StoreItem } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";

const CATEGORIES = [
  { label: "All", value: "all", icon: LayoutGrid, color: "from-slate-400 to-slate-500" },
  { label: "Monitoring", value: "Monitoring", icon: Activity, color: "from-sky-400 to-sky-600" },
  { label: "Equipment", value: "Equipment", icon: Stethoscope, color: "from-violet-400 to-violet-600" },
  { label: "Recovery", value: "Recovery", icon: HeartPulse, color: "from-emerald-400 to-emerald-600" },
  { label: "Elderly Support", value: "Elderly Support", icon: Accessibility, color: "from-amber-400 to-amber-600" },
  { label: "Masks & Protection", value: "Masks & Protection", icon: Shield, color: "from-rose-400 to-rose-600" },
] as const;

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    Monitoring: "from-sky-100 to-sky-200",
    Equipment: "from-violet-100 to-violet-200",
    Recovery: "from-emerald-100 to-emerald-200",
    "Elderly Support": "from-amber-100 to-amber-200",
    "Masks & Protection": "from-rose-100 to-rose-200",
  };
  return map[category] ?? "from-slate-100 to-slate-200";
}

function getCategoryBadgeColor(category: string): string {
  const map: Record<string, string> = {
    Monitoring: "bg-sky-100 text-sky-700",
    Equipment: "bg-violet-100 text-violet-700",
    Recovery: "bg-emerald-100 to-emerald-700 text-emerald-700",
    "Elderly Support": "bg-amber-100 text-amber-700",
    "Masks & Protection": "bg-rose-100 text-rose-700",
  };
  return map[category] ?? "bg-slate-100 text-slate-600";
}

function getCategoryIcon(category: string) {
  const map: Record<string, React.ElementType> = {
    Monitoring: Activity,
    Equipment: Stethoscope,
    Recovery: HeartPulse,
    "Elderly Support": Accessibility,
    "Masks & Protection": Shield,
  };
  const Icon = map[category] ?? BriefcaseMedical;
  return <Icon className="h-10 w-10 text-slate-400 opacity-60" />;
}

export default function StorePage() {
  const { cart, addToCart, removeFromCart, totalItems } = useCart();
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
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, search]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Store Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-6 shadow-[0_10px_40px_-20px_rgba(124,58,237,0.5)] text-white sm:p-10 flex justify-between items-center">
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold text-violet-100 uppercase tracking-wider sm:text-sm">
            Medical Store
          </p>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight sm:text-4xl">
            Supplies delivered to your door.
          </h1>
          <p className="mt-2 text-sm text-violet-100 sm:mt-4 sm:text-base sm:text-violet-50">
            Order essential medical equipment and home-care supplies.
          </p>
        </div>

        <Link
          href="/patient/cart"
          className="relative hidden md:flex flex-col items-center justify-center h-24 w-24 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 z-10 hover:bg-white/30 transition shadow-xl"
        >
          <ShoppingCart className="h-8 w-8 mb-1" />
          <span className="font-bold text-lg">{totalItems}</span>
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
              {totalItems}
            </span>
          )}
        </Link>

        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-black/10 blur-2xl" />
      </section>

      {/* Search + Category Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or category..."
            className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.value;
            const Icon = cat.icon;
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
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      <SectionContainer
        title={activeCategory === "all" ? "All Products" : activeCategory}
        description={
          loading
            ? "Loading products..."
            : filtered.length > 0
            ? `${filtered.length} product${filtered.length !== 1 ? "s" : ""} available`
            : "No products match your search."
        }
      >
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageOpen className="h-14 w-14 text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-700">No products found</p>
            <p className="text-sm text-slate-500 mt-1">
              Try a different search term or category.
            </p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("all"); }}
              className="mt-4 rounded-xl bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const quantity = cart[item.id] || 0;
              const gradientBg = getCategoryColor(item.category);
              const badgeColor = getCategoryBadgeColor(item.category);
              return (
                <div
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:border-violet-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group"
                >
                  {/* Product Image / Icon Area */}
                  <div
                    className={`flex h-40 flex-col items-center justify-center bg-gradient-to-br ${gradientBg} gap-2 transition-transform duration-300`}
                  >
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                      {item.image}
                    </span>
                  </div>

                  {/* Product Info */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}
                      >
                        {item.category}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 leading-snug mb-1">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {item.description}
                    </p>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="text-xl font-extrabold text-sky-600">
                        ${item.price.toFixed(2)}
                      </span>

                      {quantity > 0 ? (
                        <div className="flex items-center gap-1 bg-violet-50 border border-violet-100 rounded-2xl p-1">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-violet-600 hover:bg-violet-100 rounded-xl transition"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-bold text-violet-800 w-5 text-center text-sm">
                            {quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item.id)}
                            className="p-1.5 text-violet-600 hover:bg-violet-100 rounded-xl transition"
                            aria-label="Increase quantity"
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
                          {toastItemId === item.id ? "Added!" : "Add to Cart"}
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

      {/* Floating Cart Preview */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-md bg-slate-800 text-white p-4 rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex items-center justify-between border border-slate-700 z-50 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3">
            <div className="bg-slate-700 p-2 rounded-2xl">
              <PackageOpen className="h-6 w-6 text-violet-300" />
            </div>
            <div>
              <p className="font-bold">
                {totalItems} item{totalItems > 1 ? "s" : ""} in cart
              </p>
              <p className="text-xs text-slate-400">Ready for checkout</p>
            </div>
          </div>
          <Link
            href="/patient/cart"
            className="bg-violet-500 hover:bg-violet-600 transition px-6 py-2.5 rounded-2xl font-bold text-sm shadow-md"
          >
            Checkout
          </Link>
        </div>
      )}
    </div>
  );
}
