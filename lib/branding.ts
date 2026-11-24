import { api } from "@/lib/api";
import type {
  BrandingSettings,
  LogoVariant,
  UpdateBrandingBody,
} from "@/lib/types";

export const DEFAULT_APP_NAME = "Qenenia ERP";
/** Default light-mode / print logo (PNG with transparency). */
export const DEFAULT_LOGO_LIGHT_SRC = "/qenenia-erp-horizontal.png";
/** Default dark-mode logo — same asset until a dedicated dark file is added. */
export const DEFAULT_LOGO_DARK_SRC = "/qenenia-erp-horizontal.png";
export const DEFAULT_LOGO_SRC = DEFAULT_LOGO_LIGHT_SRC;

export const DEFAULT_BRANDING: BrandingSettings = {
  appName: DEFAULT_APP_NAME,
  logoLightUrl: null,
  logoDarkUrl: null,
  logoUrl: null,
  legalName: null,
  tagline: null,
  email: null,
  phone: null,
  website: null,
  address: null,
  taxId: null,
  registrationNumber: null,
  invoiceHeaderText: null,
  invoiceFooterText: null,
  termsAndConditions: null,
  bankDetails: null,
};

/** localStorage key so soft client navigations / reloads keep the last known brand. */
export const BRANDING_CACHE_KEY = "stock_branding_v3";

/** API origin without trailing `/api` (for uploaded asset URLs). */
export function getApiOrigin(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
  return base.replace(/\/api\/?$/, "");
}

/**
 * Resolve a branding asset URL from the API.
 * Accepts absolute URLs, `/uploads/...` paths, or null (fallback).
 */
export function resolveBrandingAssetUrl(
  url: string | null | undefined,
  fallback: string = DEFAULT_LOGO_SRC
): string {
  if (!url || !url.trim()) return fallback;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${getApiOrigin()}${trimmed}`;
  }
  return `${getApiOrigin()}/${trimmed}`;
}

export function normalizeBranding(
  raw?: Partial<BrandingSettings> & {
    /** @deprecated API previously returned heroImageUrl for landing hero */
    heroImageUrl?: string | null;
  } | null
): BrandingSettings {
  const appName = raw?.appName?.trim() || DEFAULT_APP_NAME;
  const logoLightUrl =
    raw?.logoLightUrl?.trim() ||
    raw?.logoUrl?.trim() ||
    raw?.heroImageUrl?.trim() ||
    null;
  const logoDarkUrl = raw?.logoDarkUrl?.trim() || null;
  return {
    appName,
    logoLightUrl,
    logoDarkUrl,
    logoUrl: logoLightUrl,
    legalName: raw?.legalName?.trim() || null,
    tagline: raw?.tagline?.trim() || null,
    email: raw?.email?.trim() || null,
    phone: raw?.phone?.trim() || null,
    website: raw?.website?.trim() || null,
    address: raw?.address?.trim() || null,
    taxId: raw?.taxId?.trim() || null,
    registrationNumber: raw?.registrationNumber?.trim() || null,
    invoiceHeaderText: raw?.invoiceHeaderText?.trim() || null,
    invoiceFooterText: raw?.invoiceFooterText?.trim() || null,
    termsAndConditions: raw?.termsAndConditions?.trim() || null,
    bankDetails: raw?.bankDetails?.trim() || null,
    updatedAt: raw?.updatedAt,
  };
}

export async function fetchPublicBranding(): Promise<BrandingSettings> {
  try {
    const data = await api<BrandingSettings>("/public/branding", {
      auth: false,
    });
    return normalizeBranding(data);
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

export function readBrandingCache(): BrandingSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    return normalizeBranding(JSON.parse(raw) as Partial<BrandingSettings>);
  } catch {
    return null;
  }
}

export function writeBrandingCache(branding: BrandingSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
  } catch {
    /* ignore quota / private mode */
  }
}

export async function fetchAdminBranding(): Promise<BrandingSettings> {
  const data = await api<BrandingSettings>("/settings/branding");
  return normalizeBranding(data);
}

export async function updateBranding(
  body: UpdateBrandingBody
): Promise<BrandingSettings> {
  const data = await api<BrandingSettings>("/settings/branding", {
    method: "PATCH",
    body,
  });
  return normalizeBranding(data);
}

export async function uploadLogo(
  file: File,
  variant: LogoVariant = "light"
): Promise<BrandingSettings> {
  const form = new FormData();
  form.append("file", file);
  const data = await api<BrandingSettings>(
    `/settings/branding/logo/${variant}`,
    {
      method: "POST",
      body: form,
    }
  );
  return normalizeBranding(data);
}

export async function clearLogo(
  variant: LogoVariant = "light"
): Promise<BrandingSettings> {
  const data = await api<BrandingSettings>(
    `/settings/branding/logo/${variant}`,
    { method: "DELETE" }
  );
  return normalizeBranding(data);
}
