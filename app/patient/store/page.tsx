"use client";

import Link from "next/link";
import { ShoppingCart, PackageOpen, Plus, Minus } from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import SectionContainer from "@/components/patient/SectionContainer";
import { useCart } from "@/components/patient/CartContext";
import { getProducts } from "@/services/storeService";
import { StoreItem } from "@/lib/types";
import { useEffect, useState } from "react";

export default function StorePage() {
  const { cart, addToCart, removeFromCart, totalItems } = useCart();
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getProducts().then((data) => {
      if (active) {
        setProducts(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Store Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-8 shadow-[0_10px_40px_-20px_rgba(124,58,237,0.5)] text-white sm:p-10 flex justify-between items-center">
        <div className="relative z-10 max-w-xl">
          <p className="text-sm font-semibold text-violet-100 uppercase tracking-wider">Medical Store</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Supplies delivered to your door.
          </h1>
          <p className="mt-4 text-base text-violet-50">
            Order essential medical equipment and home-care supplies. High quality, pharmacist-approved.
          </p>
        </div>
        
        <Link href="/patient/cart" className="hidden md:flex flex-col items-center justify-center h-24 w-24 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 z-10 hover:bg-white/30 transition shadow-xl">
          <ShoppingCart className="h-8 w-8 mb-1" />
          <span className="font-bold text-lg">{totalItems}</span>
        </Link>

        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-black/10 blur-2xl" />
      </section>

      <SectionContainer title="Featured Products" description="Essential supplies for your home care journey.">
        {loading ? (
          <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600"></div></div>
        ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((item) => {
            const quantity = cart[item.id] || 0;
            return (
              <div key={item.id} className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:border-violet-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] group">
                <div className="flex h-40 items-center justify-center bg-slate-50 text-6xl group-hover:scale-110 transition-transform duration-300">
                  {item.image}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-800 leading-tight">{item.name}</p>
                    <p className="font-bold text-violet-700">${item.price.toFixed(2)}</p>
                  </div>
                  <p className="mb-4 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                  
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    {quantity > 0 ? (
                      <div className="flex items-center justify-between bg-violet-50 rounded-xl p-1">
                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-violet-600 hover:bg-violet-100 rounded-xl transition">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="font-bold text-violet-800">{quantity}</span>
                        <button onClick={() => addToCart(item.id)} className="p-2 text-violet-600 hover:bg-violet-100 rounded-xl transition">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <PatientButton onClick={() => addToCart(item.id)} className="w-full justify-center bg-slate-800 hover:bg-slate-700 rounded-xl">
                        Add to Cart
                      </PatientButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </SectionContainer>

      {/* Cart Preview (Floating Bottom) */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-md bg-slate-800 text-white p-4 rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex items-center justify-between border border-slate-700 z-50 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3">
            <div className="bg-slate-700 p-2 rounded-2xl">
              <PackageOpen className="h-6 w-6 text-violet-300" />
            </div>
            <div>
              <p className="font-bold">{totalItems} item{totalItems > 1 ? 's' : ''} in cart</p>
              <p className="text-xs text-slate-400">Ready for checkout</p>
            </div>
          </div>
          <Link href="/patient/cart" className="bg-violet-500 hover:bg-violet-600 transition px-6 py-2.5 rounded-2xl font-bold text-sm shadow-md">
            Checkout
          </Link>
        </div>
      )}
    </div>
  );
}
