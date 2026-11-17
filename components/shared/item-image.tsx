"use client";

import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemImageSize = "sm" | "md" | "lg" | "full";

const sizeClass: Record<ItemImageSize, string> = {
  sm: "size-10",
  md: "size-20",
  lg: "aspect-[4/3] w-full",
  full: "aspect-[4/3] w-full",
};

/**
 * Standardized product image frame: fixed ratio, contain (no crop), muted backdrop.
 */
export function ItemImage({
  src,
  alt = "",
  size = "full",
  className,
  imgClassName,
  rounded = true,
}: {
  src?: string | null;
  alt?: string;
  size?: ItemImageSize;
  className?: string;
  imgClassName?: string;
  rounded?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-[var(--erp-border)] bg-[var(--erp-section-head)]",
        rounded && "rounded-md",
        sizeClass[size],
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={cn(
            "h-full w-full object-contain object-center",
            imgClassName
          )}
        />
      ) : (
        <ImageIcon
          className={cn(
            "text-[var(--erp-text-muted)] opacity-50",
            size === "sm" ? "size-4" : size === "md" ? "size-6" : "size-10"
          )}
        />
      )}
    </div>
  );
}
