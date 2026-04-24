"use client";

import Link from "next/link";
import { PackageOpen, ArrowLeft, Plus, Minus, CheckCircle2 } from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import SectionContainer from "@/components/patient/SectionContainer";
import { useCart } from "@/components/patient/CartContext";
import { getProducts } from "@/services/storeService";
import { StoreItem } from "@/lib/types";
import { useState, useEffect } from "react";

export default function CartPage() {
  const { cart, removeFromCart, addToCart, totalItems } = useCart();
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const cartItems = products.filter((item) => cart[item.id] > 0).map((item) => ({
    ...item,
    quantity: cart[item.id],
  }));

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 5.00 : 0;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    setCheckingOut(true);
    setTimeout(() => {
      setCheckingOut(false);
      setSuccess(true);
      // Ideally clear cart here, but we can leave it for the demo
    }, 1500);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50 p-10 text-center shadow-sm animate-in fade-in zoom-in-95">
        <CheckCircle2 className="mb-4 h-20 w-20 text-emerald-500" />
        <h3 className="text-3xl font-extrabold text-slate-800">Order Placed!</h3>
        <p className="mt-3 text-slate-600 max-w-md mx-auto">
          Your medical supplies have been ordered successfully. They will be delivered to your registered address within 24 hours.
        </p>
        <Link href="/patient" className="mt-8 rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 shadow-md">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/patient/store" className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Your Cart</h1>
          <p className="text-sm text-slate-500">{totalItems} items selected</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600"></div></div>
      ) : totalItems === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <PackageOpen className="mx-auto mb-4 h-16 w-16 text-slate-300" />
          <h3 className="text-xl font-bold text-slate-700">Your cart is empty</h3>
          <p className="mt-2 text-slate-500">Browse the medical store to find what you need.</p>
          <div className="mt-6">
            <PatientButton href="/patient/store">Go to Store</PatientButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-4 items-center rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-4xl border border-slate-100">
                  {item.image}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="font-bold text-slate-800">{item.name}</h4>
                  <p className="text-sm text-slate-500">{item.category}</p>
                  <p className="mt-1 font-bold text-violet-700">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-100">
                  <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => addToCart(item.id)} className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Order Summary</h3>
              
              <div className="space-y-3 text-sm text-slate-600 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-medium">${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-base text-slate-800">
                  <span className="font-bold">Total</span>
                  <span className="font-extrabold text-violet-700">${total.toFixed(2)}</span>
                </div>
              </div>

              <PatientButton 
                onClick={handleCheckout} 
                loading={checkingOut} 
                className="w-full justify-center bg-violet-600 hover:bg-violet-700 rounded-xl py-3 text-base shadow-[0_8px_20px_-8px_rgba(124,58,237,0.6)]"
              >
                Checkout Now
              </PatientButton>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <PackageOpen className="h-4 w-4" /> Next day delivery guaranteed
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
