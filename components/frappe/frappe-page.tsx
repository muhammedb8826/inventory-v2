"use client";

import { cn } from "@/lib/utils";
import { FrappeBreadcrumbs } from "./frappe-breadcrumbs";
import {
  ListFilters,
  type ListFilterChip,
} from "@/components/shared/list-filters";

export interface FrappeBreadcrumb {
  label: string;
  href?: string;
}

export type { ListFilterChip };

export function FrappePageHead({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: FrappeBreadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}) {
  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 0);

  return (
    <div
      className={cn(
        "erp-page-head frappe-page-head shrink-0 bg-[var(--erp-surface)]",
        className
      )}
    >
      {hasBreadcrumbs ? (
        <div className="border-b border-[var(--erp-border)] bg-[var(--erp-section-head)]/70">
          <div className="px-3 py-2 sm:px-4 lg:px-6">
            <FrappeBreadcrumbs items={breadcrumbs!} />
          </div>
        </div>
      ) : null}

      <div className="border-b border-[var(--erp-border)]">
        <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5 lg:px-6">
          <div className="min-w-0">
            <h1 className="font-heading truncate text-lg font-semibold tracking-tight text-[var(--erp-text)] sm:text-xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-[var(--erp-text-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FrappePageBody({
  children,
  className,
  noPadding,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 overflow-auto bg-[var(--erp-desk)]",
        !noPadding && "p-3 sm:p-4 lg:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Compact search toolbar + optional filter side sheet. */
export function FrappeFilterBar({
  children,
  className,
  title = "Filters",
  description,
  search,
  chips,
  onClearAll,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  search?: React.ReactNode;
  chips?: ListFilterChip[];
  onClearAll?: () => void;
}) {
  return (
    <ListFilters
      className={className}
      title={title}
      description={description}
      search={search}
      chips={chips}
      onClearAll={onClearAll}
    >
      {children}
    </ListFilters>
  );
}

export function FrappeListToolbar({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-3 flex flex-col gap-2 rounded-lg border border-[var(--erp-border)]/80 bg-[var(--erp-surface)]/70 px-3 py-2 text-sm backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className
      )}
    >
      {children ?? (
        <span className="text-[var(--erp-text-muted)]">
          Use filters and row actions to manage records
        </span>
      )}
    </div>
  );
}

export function FrappeFormToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mx-3 -mt-3 mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--erp-border)] bg-[var(--erp-surface)] px-3 py-2.5 shadow-sm sm:-mx-4 sm:-mt-4 sm:px-4 lg:-mx-6 lg:-mt-6 lg:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FrappeDocument({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
