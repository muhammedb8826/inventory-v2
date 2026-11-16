"use client";

import { cn } from "@/lib/utils";
import { DEFAULT_APP_NAME, DEFAULT_LOGO_SRC } from "@/lib/branding";

export function BrandLogo({
  className,
  imgClassName,
  alt,
}: {
  className?: string;
  imgClassName?: string;
  /** Kept for call-site compatibility; unused with native img. */
  priority?: boolean;
  alt?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className
      )}
    >
      {/* Native img: Next/Image + w-auto often collapses width to 0 in flex layouts */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DEFAULT_LOGO_SRC}
        alt={alt ?? DEFAULT_APP_NAME}
        width={720}
        height={180}
        decoding="async"
        className={cn(
          "block h-8 w-auto max-w-full object-contain object-left",
          imgClassName
        )}
      />
    </span>
  );
}
