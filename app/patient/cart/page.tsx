"use client";

import Link from "next/link";
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
import { StoreItem } from "@/lib/types";
import { useState, useEffect } from "react";

export default function CartPage() {
  const { cart, removeFromCart, addToCart, removeItemCompletely, clearCart, totalItems } = useCart();
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
      // Get current auth user
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

  // ---- Success State ----
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50 p-12 text-center shadow-sm animate-in fade-in zoom-in-95 min-h-[400px]">
        <CheckCircle2 className="mb-5 h-20 w-20 text-emerald-500" />
        <h3 className="text-3xl font-extrabold text-slate-800">
          Order Placed!
        </h3>
        {orderId && (
          <p className="mt-2 text-xs font-mono text-slate-400">
            Order #{orderId.slice(-10).toUpperCase()}
          </p>
        )}
        <p className="mt-4 text-slate-600 max-w-md mx-auto leading-relaxed">
          We&apos;ve received your order. Our team will review it and update the status as it moves through processing. You can track its progress from your orders page.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/patient/store"
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            Continue Shopping
          </Link>
          <Link
            href="/patient/orders"
            className="rounded-2xl bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 shadow-md transition"
          >
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/patient/store"
          className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          aria-label="Back to store"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
            Your Cart
          </h1>
          <p className="text-sm text-slate-500">
            {totalItems > 0
              ? `${totalItems} item${totalItems !== 1 ? "s" : ""} selected`
              : "Your cart is empty"}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        </div>
      ) : totalItems === 0 ? (
        /* Empty Cart */
        <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
          <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-slate-200" />
          <h3 className="text-xl font-bold text-slate-700">
            Your cart is empty
          </h3>
          <p className="mt-2 text-slate-500">
            Browse the medical store to find what you need.
          </p>
          <div className="mt-6">
            <PatientButton href="/patient/store">Browse Store</PatientButton>
          </div>
        </div>
      ) : (
        /* Cart Content */
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row gap-4 items-center rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition"
              >
                {/* Thumbnail */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-4xl">
                  {item.image}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h4 className="font-bold text-slate-800 leading-tight">
                    {item.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.category}
                  </p>
                  <p className="mt-1.5 font-bold text-sky-600">
                    ${item.price.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      each
                    </span>
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-50 rounded-2xl border border-slate-100 p-1">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-slate-600 hover:bg-slate-200 rounded-xl transition"
                      aria-label="Decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-bold w-6 text-center text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => addToCart(item.id)}
                      className="p-2 text-slate-600 hover:bg-slate-200 rounded-xl transition"
                      aria-label="Increase"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Subtotal for this item */}
                  <span className="text-base font-extrabold text-slate-800 w-16 text-right">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>

                  {/* Remove button */}
                  <button
                    onClick={() => removeItemCompletely(item.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-5 pb-4 border-b border-slate-100">
                Order Summary
              </h3>

              <div className="space-y-3 text-sm text-slate-600 mb-6">
                <div className="flex justify-between">
                  <span>
                    Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})
                  </span>
                  <span className="font-semibold text-slate-800">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-slate-500 text-xs text-right max-w-[55%]">
                    Calculated after admin review
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
                  <span className="font-bold text-slate-800">Total</span>
                  <span className="font-extrabold text-xl text-sky-600">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <PatientButton
                onClick={handleCheckout}
                loading={checkingOut}
                className="w-full justify-center rounded-2xl py-3.5 text-base font-bold bg-violet-600 hover:bg-violet-700 shadow-[0_8px_20px_-8px_rgba(124,58,237,0.6)]"
              >
                Place Order — Cash on Delivery
              </PatientButton>

              <p className="mt-4 text-center text-xs text-slate-400 leading-relaxed">
                Our team reviews each order before it ships. You can track status from your orders page.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <Link
                  href="/patient/store"
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
