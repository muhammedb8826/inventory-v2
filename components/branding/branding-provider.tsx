"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_BRANDING,
  DEFAULT_HERO_IMAGE,
  fetchPublicBranding,
  readBrandingCache,
  resolveBrandingAssetUrl,
  writeBrandingCache,
} from "@/lib/branding";
import type { BrandingSettings } from "@/lib/types";

interface BrandingContextValue {
  branding: BrandingSettings;
  appName: string;
  heroImageSrc: string;
  headline: string;
  supportingText: string;
  loading: boolean;
  reload: () => Promise<void>;
  setBranding: (next: BrandingSettings) => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

function isDefaultBranding(b: BrandingSettings) {
  return (
    b.appName === DEFAULT_BRANDING.appName &&
    !b.heroImageUrl &&
    (b.headline ?? null) === (DEFAULT_BRANDING.headline ?? null) &&
    (b.supportingText ?? null) === (DEFAULT_BRANDING.supportingText ?? null)
  );
}

export function BrandingProvider({
  children,
  initialBranding,
}: {
  children: React.ReactNode;
  /** From root layout SSR — prevents default → custom flash. */
  initialBranding?: BrandingSettings | null;
}) {
  const [branding, setBrandingState] = useState<BrandingSettings>(
    () => initialBranding ?? DEFAULT_BRANDING
  );
  const [loading, setLoading] = useState(!initialBranding);

  const setBranding = useCallback((next: BrandingSettings) => {
    setBrandingState(next);
    writeBrandingCache(next);
  }, []);

  const reload = useCallback(async () => {
    // Soft refresh: keep current brand visible; never snap back to defaults.
    setLoading(true);
    try {
      const next = await fetchPublicBranding();
      setBranding(next);
    } finally {
      setLoading(false);
    }
  }, [setBranding]);

  useEffect(() => {
    // Prefer SSR payload; only hydrate from cache when SSR fell back to defaults
    // (e.g. API briefly unreachable during render).
    if (!initialBranding || isDefaultBranding(initialBranding)) {
      const cached = readBrandingCache();
      if (cached && !isDefaultBranding(cached)) {
        setBrandingState(cached);
        setLoading(false);
      }
    } else {
      writeBrandingCache(initialBranding);
    }

    void reload();
  }, [initialBranding, reload]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      appName: branding.appName,
      heroImageSrc: resolveBrandingAssetUrl(
        branding.heroImageUrl,
        DEFAULT_HERO_IMAGE
      ),
      headline: branding.headline ?? DEFAULT_BRANDING.headline!,
      supportingText:
        branding.supportingText ?? DEFAULT_BRANDING.supportingText!,
      loading,
      reload,
      setBranding,
    }),
    [branding, loading, reload, setBranding]
  );

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    return {
      branding: DEFAULT_BRANDING,
      appName: DEFAULT_BRANDING.appName,
      heroImageSrc: DEFAULT_HERO_IMAGE,
      headline: DEFAULT_BRANDING.headline!,
      supportingText: DEFAULT_BRANDING.supportingText!,
      loading: false,
      reload: async () => undefined,
      setBranding: () => undefined,
    };
  }
  return ctx;
}
