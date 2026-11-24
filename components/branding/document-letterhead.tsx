"use client";

import { BrandLogo } from "@/components/branding/brand-logo";
import { useBranding } from "@/components/branding/branding-provider";
import { cn } from "@/lib/utils";

/** Company letterhead for printable invoices / papers (always light logo). */
export function DocumentLetterhead({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const { appName, branding } = useBranding();
  const displayName = branding.legalName?.trim() || appName;
  const contactBits = [
    branding.address,
    branding.phone,
    branding.email,
    branding.website,
    branding.taxId ? `Tax ID: ${branding.taxId}` : null,
    branding.registrationNumber
      ? `Reg: ${branding.registrationNumber}`
      : null,
  ].filter(Boolean);

  return (
    <header
      className={cn(
        "document-letterhead flex flex-wrap items-start justify-between gap-4 border-b border-[var(--frappe-border)] pb-4",
        className
      )}
    >
      <div className="min-w-0 max-w-md space-y-2">
        <BrandLogo forceVariant="light" imgClassName="h-10 sm:h-12" />
        <div>
          <p className="text-sm font-semibold text-[var(--qenenia-navy)]">
            {displayName}
          </p>
          {branding.tagline ? (
            <p className="text-xs text-[var(--frappe-text-muted)]">
              {branding.tagline}
            </p>
          ) : null}
          {branding.invoiceHeaderText ? (
            <p className="mt-1 text-xs font-medium text-[var(--frappe-text)]">
              {branding.invoiceHeaderText}
            </p>
          ) : null}
          {contactBits.length ? (
            <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-[var(--frappe-text-muted)]">
              {contactBits.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 text-right">
        <h1 className="text-lg font-semibold text-[var(--frappe-text)] sm:text-xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-[var(--frappe-text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}

/** Footer block for printable papers (terms / bank / thank-you). */
export function DocumentLetterFooter({ className }: { className?: string }) {
  const { branding } = useBranding();
  const hasFooter =
    branding.invoiceFooterText ||
    branding.bankDetails ||
    branding.termsAndConditions;
  if (!hasFooter) return null;

  return (
    <footer
      className={cn(
        "document-letter-footer mt-6 space-y-3 border-t border-[var(--frappe-border)] pt-4 text-xs text-[var(--frappe-text-muted)]",
        className
      )}
    >
      {branding.invoiceFooterText ? (
        <p className="whitespace-pre-line">{branding.invoiceFooterText}</p>
      ) : null}
      {branding.bankDetails ? (
        <div>
          <p className="mb-0.5 font-medium text-[var(--frappe-text)]">
            Payment details
          </p>
          <p className="whitespace-pre-line">{branding.bankDetails}</p>
        </div>
      ) : null}
      {branding.termsAndConditions ? (
        <div>
          <p className="mb-0.5 font-medium text-[var(--frappe-text)]">
            Terms & conditions
          </p>
          <p className="whitespace-pre-line">{branding.termsAndConditions}</p>
        </div>
      ) : null}
    </footer>
  );
}
