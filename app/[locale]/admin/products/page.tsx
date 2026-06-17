"use client";

import { FormEvent, useEffect, useState } from "react";
import { Store, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import type { StoreItem } from "@/lib/types";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/services/storeService";
import LoadingScreen from "@/components/common/LoadingScreen";
import { buildLocalized, tLocalized } from "@/lib/i18nContent";
import ImageUploadField from "@/components/common/ImageUploadField";
import StoreItemImage from "@/components/common/StoreItemImage";

// Editor state mirrors the bilingual schema: every LocalizedString
// field gets a `*En` + `*Ar` text input. Submit normalizes back to
// LocalizedString via buildLocalized so an empty `ar` value omits
// the field cleanly per the plan §5 storage convention.
interface EditorForm {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: string;
  category: string;
  image: string;
}

const EMPTY_FORM: EditorForm = {
  nameEn: "",
  nameAr: "",
  descriptionEn: "",
  descriptionAr: "",
  price: "",
  category: "",
  image: "",
};

export default function AdminProductsPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const t = useTranslations("admin.products");
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditorForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function reload() {
    const data = await getProducts();
    setProducts(data);
  }

  // Gated on appUser so Firestore reads don't fire before auth restores.
  useEffect(() => {
    if (!appUser) return;
    let active = true;
    getProducts().then((data) => {
      if (active) { setProducts(data); setLoading(false); }
    });
    return () => { active = false; };
  }, [appUser]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(p: StoreItem) {
    setEditingId(p.id);
    setForm({
      nameEn: p.name.en,
      nameAr: p.name.ar ?? "",
      descriptionEn: p.description.en,
      descriptionAr: p.description.ar ?? "",
      price: String(p.price),
      category: p.category,
      image: p.image,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const name = buildLocalized(form.nameEn, form.nameAr);
    const description = buildLocalized(form.descriptionEn, form.descriptionAr);
    if (!name || !description) {
      setSaving(false);
      alert(t("nameEn") + " + " + t("descriptionEn") + " *");
      return;
    }
    const payload = {
      name,
      description,
      price: Number(form.price),
      category: form.category,
      image: form.image,
    };
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
    if (!confirm(t("confirmDelete"))) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      await reload();
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading || !appUser || loading) return <LoadingScreen text={t("loading")} />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700 shadow-md shadow-sky-600/20 transition"
        >
          <Plus className="h-5 w-5" /> {t("addProduct")}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-3xl bg-white shadow-sm border border-sky-200 p-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">{editingId ? t("editProduct") : t("addNewProduct")}</h2>
            <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Bilingual product name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t("nameEn")} *</label>
                <input required value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none" placeholder="Blood Pressure Monitor" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t("nameAr")}</label>
                <input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none" placeholder="جهاز قياس ضغط الدم" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t("price")} *</label>
                <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t("category")} *</label>
                <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none" placeholder="Equipment" />
              </div>
            </div>
            <ImageUploadField
              scope="product"
              label={t("image")}
              value={form.image}
              onChange={(image) => setForm({ ...form, image })}
              helperText="Upload a product photo, or enter a single emoji as a placeholder below."
            />
            {/* Emoji escape-hatch for the seed-data convention (single-char glyph). */}
            {!form.image && (
              <p className="text-xs text-slate-500">
                Or use an emoji glyph instead:{" "}
                <input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="ms-1 w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                  placeholder="🩺"
                  maxLength={4}
                />
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t("descriptionEn")} *</label>
                <textarea required value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} dir="ltr"
                  className="w-full min-h-[100px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t("descriptionAr")}</label>
                <textarea value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} dir="rtl"
                  className="w-full min-h-[100px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition">{t("cancel")}</button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-sky-600 font-bold text-white hover:bg-sky-700 shadow-md transition disabled:opacity-50">
                <Check className="h-4 w-4" />{saving ? t("saving") : editingId ? t("update") : t("addProduct")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
          <Store className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">{t("noProducts")}</p>
          <p className="text-slate-500 text-sm mb-4">{t("clickToAdd")}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:border-sky-200 transition-all group">
              <div className="relative h-36 flex items-center justify-center overflow-hidden bg-slate-50 border-b border-slate-100 group-hover:bg-sky-50 transition-colors">
                <StoreItemImage
                  src={p.image}
                  alt={tLocalized(p.name, "en")}
                  glyphSize="text-6xl"
                />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 leading-tight">{tLocalized(p.name, "en")}</h3>
                    {p.name.ar && <p className="mt-0.5 text-xs text-slate-500" dir="rtl">{p.name.ar}</p>}
                    {!p.name.ar && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">{t("arabicMissing")}</p>}
                  </div>
                  <span className="text-lg font-extrabold text-sky-700 shrink-0">${p.price.toFixed(2)}</span>
                </div>
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{p.category}</p>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{tLocalized(p.description, "en")}</p>
                <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                  <button onClick={() => openEdit(p)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 transition">
                    <Pencil className="h-3.5 w-3.5" /> {t("edit")}
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />{deletingId === p.id ? "..." : t("delete")}
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
