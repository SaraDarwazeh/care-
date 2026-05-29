"use client";

import { FormEvent, useEffect, useState } from "react";
import { Store, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { StoreItem } from "@/lib/types";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/services/storeService";
import LoadingScreen from "@/components/common/LoadingScreen";

const EMPTY_FORM = { name: "", description: "", price: "", category: "", image: "" };

export default function AdminProductsPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function reload() {
    const data = await getProducts();
    setProducts(data);
  }

  useEffect(() => {
    let active = true;
    getProducts().then((data) => {
      if (active) { setProducts(data); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(p: StoreItem) {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description, price: String(p.price), category: p.category, image: p.image });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { name: form.name, description: form.description, price: Number(form.price), category: form.category, image: form.image };
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await createProduct(payload);
      }
      await reload();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      await reload();
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading || !appUser || loading) return <LoadingScreen text="Loading products..." />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1">Manage the Care+ medical store catalog.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700 shadow-md shadow-sky-600/20 transition"
        >
          <Plus className="h-5 w-5" /> Add Product
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-3xl bg-white shadow-sm border border-sky-200 p-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">{editingId ? "Edit Product" : "Add New Product"}</h2>
            <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Product Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder="e.g. Blood Pressure Monitor" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Price (USD) *</label>
                <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder="e.g. Equipment" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Image (emoji or URL)</label>
                <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder="🩺 or https://..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full min-h-[100px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder="Product description..." />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-sky-600 font-bold text-white hover:bg-sky-700 shadow-md transition disabled:opacity-50">
                <Check className="h-4 w-4" />{saving ? "Saving..." : editingId ? "Update" : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
          <Store className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">No products yet</p>
          <p className="text-slate-500 text-sm mb-4">Click Add Product to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:border-sky-200 transition-all group">
              <div className="h-36 flex items-center justify-center bg-slate-50 text-6xl border-b border-slate-100 group-hover:bg-sky-50 transition-colors">
                {p.image}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-slate-800 leading-tight">{p.name}</h3>
                  <span className="text-lg font-extrabold text-sky-700 shrink-0">${p.price.toFixed(2)}</span>
                </div>
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{p.category}</p>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{p.description}</p>
                <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                  <button onClick={() => openEdit(p)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 transition">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />{deletingId === p.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
