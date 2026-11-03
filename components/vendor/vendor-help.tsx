"use client";

import { VENDOR } from "@/lib/vendor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CircleHelpIcon,
  ExternalLinkIcon,
  MailIcon,
  PhoneIcon,
} from "lucide-react";

export function VendorPoweredBy({
  className,
  tone = "muted",
}: {
  className?: string;
  tone?: "muted" | "site" | "inverse";
}) {
  const linkClass =
    tone === "inverse"
      ? "text-white/90 underline-offset-4 hover:text-white hover:underline"
      : tone === "site"
        ? "font-medium text-[var(--site-accent)] underline-offset-4 hover:underline"
        : "font-medium text-[var(--erp-accent)] underline-offset-4 hover:underline";

  const textClass =
    tone === "inverse"
      ? "text-white/65"
      : tone === "site"
        ? "text-[var(--site-ink-soft)]"
        : "text-[var(--erp-text-muted)]";

  return (
    <p className={cn("text-xs", textClass, className)}>
      Powered by{" "}
      <a
        href={VENDOR.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {VENDOR.websiteLabel}
      </a>
    </p>
  );
}

export function VendorHelpLinks({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-2.5 text-sm", className)}>
      {VENDOR.phones.map((phone) => (
        <a
          key={phone.tel}
          href={`tel:${phone.tel}`}
          className="flex items-center gap-2.5 text-[var(--erp-text)] transition-colors hover:text-[var(--erp-accent)]"
        >
          <PhoneIcon className="size-3.5 shrink-0 text-[var(--erp-text-muted)]" />
          <span className="tabular-nums">{phone.display}</span>
        </a>
      ))}
      <a
        href={`mailto:${VENDOR.email}`}
        className="flex items-center gap-2.5 text-[var(--erp-text)] transition-colors hover:text-[var(--erp-accent)]"
      >
        <MailIcon className="size-3.5 shrink-0 text-[var(--erp-text-muted)]" />
        <span className={compact ? "truncate" : undefined}>{VENDOR.email}</span>
      </a>
      <a
        href={VENDOR.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 text-[var(--erp-text)] transition-colors hover:text-[var(--erp-accent)]"
      >
        <ExternalLinkIcon className="size-3.5 shrink-0 text-[var(--erp-text-muted)]" />
        <span>{VENDOR.websiteLabel}</span>
      </a>
    </div>
  );
}

export function VendorHelpSheet({
  triggerClassName,
  variant = "ghost",
}: {
  triggerClassName?: string;
  variant?: "ghost" | "outline" | "site";
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {variant === "site" ? (
          <button
            type="button"
            className={cn(
              "text-sm font-medium transition-opacity hover:opacity-100",
              triggerClassName
            )}
          >
            Help
          </button>
        ) : (
          <Button
            type="button"
            variant={variant}
            size="icon"
            className={cn("size-8 shrink-0", triggerClassName)}
            aria-label="Help & support"
            title="Help & support"
          >
            <CircleHelpIcon className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-sm">
        <SheetHeader className="text-left">
          <SheetTitle>Help &amp; support</SheetTitle>
          <SheetDescription>
            Reach the {VENDOR.name} team for product help, onboarding, or
            technical support.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6 px-1">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-[var(--erp-text-muted)] uppercase">
              Contact
            </p>
            <VendorHelpLinks />
          </div>
          <div className="rounded-lg border border-[var(--erp-border)] bg-[var(--erp-section-head)]/60 px-4 py-3">
            <p className="text-sm font-medium text-[var(--erp-text)]">
              {VENDOR.name}
            </p>
            <VendorPoweredBy className="mt-1" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
