import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import type { SiteSettings } from "@/lib/types";

const COLLECTION = "siteSettings";
const GLOBAL_DOC = "global";

// Defaults applied when the siteSettings/global doc is missing or a
// field is omitted. Designed so a fresh project boots with every
// feature toggled on — admins opt out, not in.
export const DEFAULT_SITE_SETTINGS: Required<Pick<SiteSettings, "educationLibraryEnabled">> = {
  educationLibraryEnabled: true,
};

function normalize(data: Record<string, unknown> | undefined): SiteSettings {
  if (!data) return { ...DEFAULT_SITE_SETTINGS };
  return {
    educationLibraryEnabled:
      typeof data.educationLibraryEnabled === "boolean"
        ? data.educationLibraryEnabled
        : DEFAULT_SITE_SETTINGS.educationLibraryEnabled,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { db } = ensureClientFirebase();
  const snap = await getDoc(doc(db, COLLECTION, GLOBAL_DOC));
  if (!snap.exists()) return { ...DEFAULT_SITE_SETTINGS };
  return normalize(snap.data() as Record<string, unknown>);
}

// Admin-only mutation. Firestore rules enforce the role check; this is
// just the client-side write path. Uses setDoc with merge so partial
// updates don't clobber unrelated fields.
export async function updateSiteSettings(
  patch: Pick<SiteSettings, "educationLibraryEnabled">,
  actorUid?: string,
): Promise<void> {
  const { db } = ensureClientFirebase();
  await setDoc(
    doc(db, COLLECTION, GLOBAL_DOC),
    {
      ...patch,
      updatedAt: new Date().toISOString(),
      ...(actorUid ? { updatedBy: actorUid } : {}),
    },
    { merge: true },
  );
}

// Live subscription used by the navbar / patient surfaces so toggling
// the feature off in admin propagates without a refresh. Returns the
// unsubscribe handle.
export function subscribeSiteSettings(cb: (settings: SiteSettings) => void): () => void {
  const { db } = ensureClientFirebase();
  return onSnapshot(
    doc(db, COLLECTION, GLOBAL_DOC),
    (snap) => {
      if (!snap.exists()) {
        cb({ ...DEFAULT_SITE_SETTINGS });
        return;
      }
      cb(normalize(snap.data() as Record<string, unknown>));
    },
    () => {
      // Fail open — never block UI on a settings read error.
      cb({ ...DEFAULT_SITE_SETTINGS });
    },
  );
}
