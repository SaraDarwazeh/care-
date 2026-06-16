"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_SITE_SETTINGS, subscribeSiteSettings } from "@/services/siteSettingsService";
import type { SiteSettings } from "@/lib/types";

interface SiteSettingsState {
  settings: SiteSettings;
  loading: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsState>({
  settings: { ...DEFAULT_SITE_SETTINGS },
  loading: true,
});

// Single global subscriber. Mount at the locale layout so every child
// can read the latest flags without each component re-subscribing.
export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SiteSettingsState>({
    settings: { ...DEFAULT_SITE_SETTINGS },
    loading: true,
  });

  useEffect(() => {
    const unsub = subscribeSiteSettings((settings) => {
      setState({ settings, loading: false });
    });
    return () => unsub();
  }, []);

  return <SiteSettingsContext.Provider value={state}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings(): SiteSettingsState {
  return useContext(SiteSettingsContext);
}

export function useEducationLibraryEnabled(): boolean {
  const { settings } = useSiteSettings();
  return settings.educationLibraryEnabled !== false;
}
