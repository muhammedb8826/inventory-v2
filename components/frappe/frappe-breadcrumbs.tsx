"use client";

import Link from "next/link";
import { ChevronRight, HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FrappeBreadcrumb } from "./frappe-page";

export function FrappeBreadcrumbs({
  items,
  className,
}: {
  items: FrappeBreadcrumb[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-0.5 text-[12px] leading-none",
        className
      )}
      aria-label="Breadcrumb"
    >
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1;
        const isFirst = i === 0;

        return (
          <span
            key={`${crumb.label}-${i}`}
            className="inline-flex min-w-0 items-center gap-0.5"
          >
            {i > 0 ? (
              <ChevronRight
                className="size-3 shrink-0 text-[var(--erp-text-muted)]/60"
                aria-hidden
              />
            ) : null}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className={cn(
                  "inline-flex max-w-[12rem] items-center gap-1 truncate rounded px-1.5 py-1 font-medium text-[var(--erp-text-muted)] transition-colors",
                  "hover:bg-[var(--erp-surface)] hover:text-[var(--erp-accent)]"
                )}
              >
                {isFirst ? (
                  <HomeIcon className="size-3 shrink-0 opacity-80" />
                ) : null}
                <span className="truncate">{crumb.label}</span>
              </Link>
            ) : (
              <span
                className={cn(
                  "inline-flex max-w-[14rem] items-center gap-1 truncate rounded px-1.5 py-1",
                  isLast
                    ? "font-semibold text-[var(--erp-text)]"
                    : "font-medium text-[var(--erp-text-muted)]"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {isFirst && !crumb.href ? (
                  <HomeIcon className="size-3 shrink-0 opacity-80" />
                ) : null}
                <span className="truncate">{crumb.label}</span>
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
