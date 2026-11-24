"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import {
  FrappeButtonPrimary,
  FrappeDocument,
  FrappeField,
  FrappeFormGrid,
  FrappeSection,
} from "@/components/frappe";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/components/branding/branding-provider";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  clearLogo,
  DEFAULT_LOGO_DARK_SRC,
  DEFAULT_LOGO_LIGHT_SRC,
  fetchAdminBranding,
  resolveBrandingAssetUrl,
  updateBranding,
  uploadLogo,
} from "@/lib/branding";
import { isForbiddenError } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { BrandingSettings, LogoVariant } from "@/lib/types";
import { toast } from "sonner";
import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export default function BrandingSettingsPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, "settings.write");
  const { reload: reloadPublicBranding, setBranding: setPublicBranding } =
    useBranding();
  const lightFileRef = useRef<HTMLInputElement>(null);
  const darkFileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<LogoVariant | null>(null);
  const [clearing, setClearing] = useState<LogoVariant | null>(null);

  const [appName, setAppName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tagline, setTagline] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [invoiceHeaderText, setInvoiceHeaderText] = useState("");
  const [invoiceFooterText, setInvoiceFooterText] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [logoLightUrl, setLogoLightUrl] = useState<string | null>(null);
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [lightPreview, setLightPreview] = useState<string | null>(null);
  const [darkPreview, setDarkPreview] = useState<string | null>(null);

  function applyBranding(data: BrandingSettings) {
    setAppName(data.appName);
    setLegalName(data.legalName ?? "");
    setTagline(data.tagline ?? "");
    setEmail(data.email ?? "");
    setPhone(data.phone ?? "");
    setWebsite(data.website ?? "");
    setAddress(data.address ?? "");
    setTaxId(data.taxId ?? "");
    setRegistrationNumber(data.registrationNumber ?? "");
    setInvoiceHeaderText(data.invoiceHeaderText ?? "");
    setInvoiceFooterText(data.invoiceFooterText ?? "");
    setTermsAndConditions(data.termsAndConditions ?? "");
    setBankDetails(data.bankDetails ?? "");
    setLogoLightUrl(data.logoLightUrl ?? data.logoUrl ?? null);
    setLogoDarkUrl(data.logoDarkUrl ?? null);
    setPublicBranding(data);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchAdminBranding();
        if (!cancelled) applyBranding(data);
      } catch (err) {
        if (!cancelled && !isForbiddenError(err)) {
          toast.error(errorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (lightPreview) URL.revokeObjectURL(lightPreview);
      if (darkPreview) URL.revokeObjectURL(darkPreview);
    };
  }, [lightPreview, darkPreview]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    if (!appName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      const data = await updateBranding({
        appName: appName.trim(),
        legalName: emptyToNull(legalName),
        tagline: emptyToNull(tagline),
        email: emptyToNull(email),
        phone: emptyToNull(phone),
        website: emptyToNull(website),
        address: emptyToNull(address),
        taxId: emptyToNull(taxId),
        registrationNumber: emptyToNull(registrationNumber),
        invoiceHeaderText: emptyToNull(invoiceHeaderText),
        invoiceFooterText: emptyToNull(invoiceFooterText),
        termsAndConditions: emptyToNull(termsAndConditions),
        bankDetails: emptyToNull(bankDetails),
      });
      applyBranding(data);
      await reloadPublicBranding();
      toast.success("Company settings saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File, variant: LogoVariant) {
    if (!canWrite) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Use a PNG (recommended), JPEG, WebP, or GIF");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    if (file.type !== "image/png") {
      toast.message("PNG with a transparent background looks best on the sidebar and papers.");
    }

    if (variant === "light") {
      if (lightPreview) URL.revokeObjectURL(lightPreview);
      setLightPreview(URL.createObjectURL(file));
    } else {
      if (darkPreview) URL.revokeObjectURL(darkPreview);
      setDarkPreview(URL.createObjectURL(file));
    }

    setUploading(variant);
    try {
      const data = await uploadLogo(file, variant);
      applyBranding(data);
      await reloadPublicBranding();
      toast.success(
        variant === "dark" ? "Dark mode logo uploaded" : "Light mode logo uploaded"
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(null);
      const ref = variant === "light" ? lightFileRef : darkFileRef;
      if (ref.current) ref.current.value = "";
    }
  }

  async function handleClear(variant: LogoVariant) {
    if (!canWrite) return;
    if (
      !confirm(
        variant === "dark"
          ? "Remove the dark mode logo?"
          : "Remove the light mode logo and use the default?"
      )
    ) {
      return;
    }
    setClearing(variant);
    try {
      const data = await clearLogo(variant);
      if (variant === "light" && lightPreview) {
        URL.revokeObjectURL(lightPreview);
        setLightPreview(null);
      }
      if (variant === "dark" && darkPreview) {
        URL.revokeObjectURL(darkPreview);
        setDarkPreview(null);
      }
      applyBranding(data);
      await reloadPublicBranding();
      toast.success("Logo cleared");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setClearing(null);
    }
  }

  const lightSrc =
    lightPreview ||
    resolveBrandingAssetUrl(logoLightUrl, DEFAULT_LOGO_LIGHT_SRC);
  const darkSrc =
    darkPreview ||
    resolveBrandingAssetUrl(
      logoDarkUrl || logoLightUrl,
      logoDarkUrl ? DEFAULT_LOGO_DARK_SRC : lightSrc
    );

  return (
    <AppShell
      title="Company & branding"
      subtitle="Logos, company details, and invoice template texts"
      breadcrumbs={[
        { label: "Home", href: "/dashboard" },
        { label: "Branding" },
      ]}
    >
      <PermissionGate
        permissions={["settings.read", "settings.write"]}
        showDenied
      >
        {loading ? (
          <PageLoading />
        ) : (
          <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-4">
            <FrappeDocument>
              <FrappeSection
                title="Company"
                description="Shown in the app and on printable documents."
              >
                <FrappeFormGrid columns={2}>
                  <FrappeField label="Display name" required>
                    <Input
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      required
                      maxLength={80}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField
                    label="Legal name"
                    hint="Registered name on invoices"
                  >
                    <Input
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      maxLength={160}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField label="Tagline" fullWidth>
                    <Input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      maxLength={200}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField label="Email">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={160}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField label="Phone">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={64}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField label="Website">
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      maxLength={200}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField label="Tax / VAT ID">
                    <Input
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      maxLength={64}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField label="Registration number" fullWidth>
                    <Input
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      maxLength={64}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField label="Address" fullWidth>
                    <Textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      maxLength={500}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                </FrappeFormGrid>
              </FrappeSection>

              <FrappeSection
                title="Logos"
                description="Use PNG with a transparent background. Light logo for print and light UI; dark logo for the navy sidebar / dark mode."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <LogoUploadCard
                    title="Light mode / print"
                    hint="Transparent PNG on white papers"
                    previewSrc={lightSrc}
                    previewClassName="bg-white"
                    canWrite={canWrite}
                    uploading={uploading === "light"}
                    clearing={clearing === "light"}
                    hasCustom={!!logoLightUrl}
                    fileRef={lightFileRef}
                    onPick={() => lightFileRef.current?.click()}
                    onFile={(file) => void handleUpload(file, "light")}
                    onClear={() => void handleClear("light")}
                  />
                  <LogoUploadCard
                    title="Dark mode / sidebar"
                    hint="Transparent PNG on navy / dark UI"
                    previewSrc={darkSrc}
                    previewClassName="bg-[var(--qenenia-navy)]"
                    canWrite={canWrite}
                    uploading={uploading === "dark"}
                    clearing={clearing === "dark"}
                    hasCustom={!!logoDarkUrl}
                    fileRef={darkFileRef}
                    onPick={() => darkFileRef.current?.click()}
                    onFile={(file) => void handleUpload(file, "dark")}
                    onClear={() => void handleClear("dark")}
                  />
                </div>
              </FrappeSection>

              <FrappeSection
                title="Invoice & document templates"
                description="Header and footer texts used when generating invoices and other papers."
              >
                <FrappeFormGrid columns={1}>
                  <FrappeField
                    label="Invoice header text"
                    hint="Short line under the company name (e.g. Tax Invoice · Thank you for your business)"
                  >
                    <Input
                      value={invoiceHeaderText}
                      onChange={(e) => setInvoiceHeaderText(e.target.value)}
                      maxLength={400}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField label="Invoice footer text">
                    <Textarea
                      value={invoiceFooterText}
                      onChange={(e) => setInvoiceFooterText(e.target.value)}
                      rows={2}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField
                    label="Bank / payment details"
                    hint="Printed on invoices so customers know where to pay"
                  >
                    <Textarea
                      value={bankDetails}
                      onChange={(e) => setBankDetails(e.target.value)}
                      rows={3}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField label="Terms and conditions">
                    <Textarea
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      rows={4}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                </FrappeFormGrid>
              </FrappeSection>
            </FrappeDocument>

            {canWrite ? (
              <div className="flex justify-end">
                <FrappeButtonPrimary type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save company settings"}
                </FrappeButtonPrimary>
              </div>
            ) : null}
          </form>
        )}
      </PermissionGate>
    </AppShell>
  );
}

function LogoUploadCard({
  title,
  hint,
  previewSrc,
  previewClassName,
  canWrite,
  uploading,
  clearing,
  hasCustom,
  fileRef,
  onPick,
  onFile,
  onClear,
}: {
  title: string;
  hint: string;
  previewSrc: string;
  previewClassName: string;
  canWrite: boolean;
  uploading: boolean;
  clearing: boolean;
  hasCustom: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onPick: () => void;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-[var(--frappe-border)] p-3">
      <div>
        <p className="text-sm font-medium text-[var(--frappe-text)]">{title}</p>
        <p className="text-xs text-[var(--frappe-text-muted)]">{hint}</p>
      </div>
      <div
        className={`flex min-h-24 items-center justify-center rounded-md border border-[var(--frappe-border)] px-4 py-6 ${previewClassName}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt={`${title} preview`}
          className="max-h-14 w-auto max-w-full bg-transparent object-contain"
        />
      </div>
      {canWrite ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
          <FrappeButtonPrimary
            type="button"
            disabled={uploading}
            onClick={onPick}
          >
            <UploadIcon className="size-3.5" />
            {uploading ? "Uploading…" : "Upload PNG"}
          </FrappeButtonPrimary>
          {hasCustom ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs text-destructive"
              disabled={clearing}
              onClick={onClear}
            >
              <Trash2Icon className="size-3.5" />
              {clearing ? "Clearing…" : "Clear"}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--frappe-text-muted)]">
              <ImageIcon className="size-3.5" />
              Default logo
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
