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
  DEFAULT_LOGO_DARK_SRC,
  DEFAULT_LOGO_LIGHT_SRC,
  fetchPublicBranding,
  readBrandingCache,
  resolveBrandingAssetUrl,
  writeBrandingCache,
} from "@/lib/branding";
import type { BrandingSettings } from "@/lib/types";

interface BrandingContextValue {
  branding: BrandingSettings;
  appName: string;
  logoLightSrc: string;
  logoDarkSrc: string;
  /** @deprecated Prefer logoLightSrc / theme-aware BrandLogo */
  logoSrc: string;
  loading: boolean;
  reload: () => Promise<void>;
  setBranding: (next: BrandingSettings) => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

function isDefaultBranding(b: BrandingSettings) {
  return (
    b.appName === DEFAULT_BRANDING.appName &&
    !b.logoLightUrl &&
    !b.logoDarkUrl &&
    !b.logoUrl
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
    setLoading(true);
    try {
      const next = await fetchPublicBranding();
      setBranding(next);
    } finally {
      setLoading(false);
    }
  }, [setBranding]);

  useEffect(() => {
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

  const value = useMemo<BrandingContextValue>(() => {
    const logoLightSrc = resolveBrandingAssetUrl(
      branding.logoLightUrl || branding.logoUrl,
      DEFAULT_LOGO_LIGHT_SRC
    );
    const logoDarkSrc = resolveBrandingAssetUrl(
      branding.logoDarkUrl || branding.logoLightUrl || branding.logoUrl,
      branding.logoDarkUrl ? DEFAULT_LOGO_DARK_SRC : logoLightSrc
    );
    return {
      branding,
      appName: branding.appName,
      logoLightSrc,
      logoDarkSrc,
      logoSrc: logoLightSrc,
      loading,
      reload,
      setBranding,
    };
  }, [branding, loading, reload, setBranding]);

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
      logoLightSrc: DEFAULT_LOGO_LIGHT_SRC,
      logoDarkSrc: DEFAULT_LOGO_DARK_SRC,
      logoSrc: DEFAULT_LOGO_LIGHT_SRC,
      loading: false,
      reload: async () => undefined,
      setBranding: () => undefined,
    };
  }
  return ctx;
}
