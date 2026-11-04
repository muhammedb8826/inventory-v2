import { cache } from "react";
import { DEFAULT_BRANDING, normalizeBranding } from "@/lib/branding";
import type { BrandingSettings } from "@/lib/types";

/**
 * Server-only branding fetch (deduped per request via React `cache`).
 * Keeps custom branding in the first HTML paint so the UI never flashes defaults.
 */
export const fetchPublicBrandingServer = cache(
  async (): Promise<BrandingSettings> => {
    const base =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    try {
      const res = await fetch(`${base}/public/branding`, {
        // Always fresh so admin branding edits show on the next full load.
        cache: "no-store",
      });
      if (!res.ok) return { ...DEFAULT_BRANDING };
      const data = (await res.json()) as Partial<BrandingSettings>;
      return normalizeBranding(data);
    } catch {
      return { ...DEFAULT_BRANDING };
    }
  }
);
