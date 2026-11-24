"use client";

import { useTheme } from "next-themes";
import { useIsClient } from "@/hooks/use-is-client";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/branding/branding-provider";
import { DEFAULT_APP_NAME, DEFAULT_LOGO_LIGHT_SRC } from "@/lib/branding";

export function BrandLogo({
  className,
  imgClassName,
  alt,
  src,
  /** Force light or dark asset (e.g. print always uses light). */
  forceVariant,
}: {
  className?: string;
  imgClassName?: string;
  /** Kept for call-site compatibility; unused with native img. */
  priority?: boolean;
  alt?: string;
  /** Override logo URL. Defaults to theme-aware branding logo. */
  src?: string;
  forceVariant?: "light" | "dark";
}) {
  const { appName, logoLightSrc, logoDarkSrc } = useBranding();
  const { resolvedTheme } = useTheme();
  const isClient = useIsClient();

  const themeVariant =
    forceVariant ??
    (isClient && resolvedTheme === "dark" ? "dark" : "light");

  const imageSrc =
    src ||
    (themeVariant === "dark" ? logoDarkSrc : logoLightSrc) ||
    DEFAULT_LOGO_LIGHT_SRC;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-transparent",
        className
      )}
    >
      {/* Native img keeps PNG transparency; avoid wrapping with opaque backgrounds. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt ?? appName ?? DEFAULT_APP_NAME}
        width={720}
        height={180}
        decoding="async"
        className={cn(
          "block h-8 w-auto max-w-full bg-transparent object-contain object-left",
          imgClassName
        )}
      />
    </span>
  );
}
