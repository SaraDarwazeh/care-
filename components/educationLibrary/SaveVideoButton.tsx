"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isVideoSaved, saveVideo, unsaveVideo } from "@/services/educationLibraryService";

interface SaveVideoButtonProps {
  videoId: string;
  variant?: "pill" | "icon";
  initiallySaved?: boolean;
}

// Reusable save/unsave control. Anywhere it renders for a guest, the
// click pushes to /login so saving requires an account. For a signed-in
// patient it toggles the saved state with optimistic UI; nurses and
// admins see the control disabled (they aren't the audience).
export default function SaveVideoButton({
  videoId,
  variant = "pill",
  initiallySaved,
}: SaveVideoButtonProps) {
  const router = useRouter();
  const { appUser } = useAuth();
  const t = useTranslations("educationLibrary.detail");
  const [saved, setSaved] = useState<boolean>(initiallySaved ?? false);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(typeof initiallySaved === "boolean");

  useEffect(() => {
    if (!appUser || appUser.role !== "patient" || typeof initiallySaved === "boolean") return;
    let active = true;
    isVideoSaved(appUser.id, videoId)
      .then((s) => {
        if (active) {
          setSaved(s);
          setHydrated(true);
        }
      })
      .catch((err) => {
        console.warn("[SaveVideoButton] hydrate failed", err);
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [appUser, videoId, initiallySaved]);

  async function handleClick() {
    if (busy) return;
    if (!appUser) {
      router.push("/login");
      return;
    }
    if (appUser.role !== "patient") return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      if (next) await saveVideo(appUser.id, videoId);
      else await unsaveVideo(appUser.id, videoId);
    } catch (err) {
      console.error("[SaveVideoButton] toggle failed", err);
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  }

  const isLocked = appUser?.role === "nurse" || appUser?.role === "admin";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || isLocked || !hydrated}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm transition hover:text-sky-600 disabled:opacity-50"
        aria-label={saved ? t("saved") : t("save")}
        aria-pressed={saved}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <BookmarkCheck className="h-4 w-4 text-sky-600" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || isLocked || !hydrated}
      className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
        saved
          ? "bg-sky-600 text-white shadow-md shadow-sky-600/20 hover:bg-sky-700"
          : "bg-white text-slate-700 border border-slate-200 hover:border-sky-300 hover:text-sky-700"
      }`}
      aria-pressed={saved}
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {t("saving")}
        </>
      ) : saved ? (
        <>
          <BookmarkCheck className="h-4 w-4" /> {t("saved")}
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" /> {t("save")}
        </>
      )}
    </button>
  );
}
