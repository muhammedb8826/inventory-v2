"use client";

import { EmptyState } from "@/components/shared/empty-state";
import {
  TablePagination,
  type TablePaginationProps,
} from "@/components/shared/table-pagination";
import type { ListViewMode } from "@/hooks/use-list-view-mode";
import { unwrapList } from "@/lib/list-response";
import type { PaginatedResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Prefer showing this field first in the mobile card layout */
  primary?: boolean;
  /** Preferred metric shown on the right of mobile rows */
  secondary?: boolean;
  /** Hide this column on small screens (still shown in desktop table) */
  hideOnMobile?: boolean;
}

function cellClass(className?: string) {
  return cn("text-left", className);
}

function plainText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).filter(Boolean).join(" · ");
  return "";
}

export function DataCardTable<T extends { id: string }>({
  columns,
  rows,
  emptyTitle = "No records",
  emptyDescription,
  pagination,
  viewMode = "list",
}: {
  columns: Column<T>[];
  rows: T[] | PaginatedResponse<T> | null | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: Omit<TablePaginationProps, "disabled"> & { disabled?: boolean };
  /** List vs grid. Grid uses columns as card fields. */
  viewMode?: ListViewMode;
}) {
  const list = unwrapList(rows);
  const showPagination = pagination && pagination.meta.total > 0;
  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const actionCol = columns.find((c) => c.key === "actions");
  const secondaryCol =
    columns.find((c) => c.secondary && c.key !== primaryCol?.key) ??
    columns.find(
      (c) =>
        c.key !== primaryCol?.key &&
        c.key !== "actions" &&
        !c.hideOnMobile &&
        c.header
    );
  const subtitleCols = columns
    .filter(
      (c) =>
        c.key !== primaryCol?.key &&
        c.key !== secondaryCol?.key &&
        c.key !== "actions" &&
        !c.hideOnMobile &&
        c.header
    )
    .slice(0, 2);
  const gridMetaCols = columns.filter(
    (c) => c.key !== primaryCol?.key && c.key !== "actions" && c.header
  );

  if (list.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  if (viewMode === "grid") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((row) => (
            <article
              key={row.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2 border-b border-[var(--erp-border)] bg-[var(--erp-section-head)]/60 px-3.5 py-3">
                <div className="min-w-0 text-sm font-semibold text-[var(--erp-text)]">
                  {primaryCol ? primaryCol.cell(row) : null}
                </div>
                {actionCol ? (
                  <div className="shrink-0">{actionCol.cell(row)}</div>
                ) : null}
              </div>
              {gridMetaCols.length > 0 ? (
                <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5 p-3.5">
                  {gridMetaCols.map((col) => (
                    <div key={col.key} className={cn("min-w-0", col.className)}>
                      <dt className="text-[11px] text-[var(--erp-text-muted)]">
                        {col.header}
                      </dt>
                      <dd className="mt-0.5 text-sm text-[var(--erp-text)]">
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </article>
          ))}
        </div>
        {showPagination ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm">
            <TablePagination
              meta={pagination.meta}
              onPageChange={pagination.onPageChange}
              onLimitChange={pagination.onLimitChange}
              disabled={pagination.disabled}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm">
      {/* Mobile list — compact Odoo-like rows */}
      <div className="divide-y divide-[var(--erp-border)] md:hidden">
        {list.map((row) => {
          const subtitle = subtitleCols
            .map((col) => plainText(col.cell(row)))
            .filter(Boolean)
            .join(" · ");

          return (
            <div
              key={row.id}
              className="flex items-center gap-3 px-3.5 py-3 transition-colors active:bg-[var(--erp-section-head)]/70"
            >
              <div className="min-w-0 flex-1">
                <div className="min-w-0 text-sm font-medium text-[var(--erp-text)]">
                  {primaryCol ? primaryCol.cell(row) : null}
                </div>
                {subtitle ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--erp-text-muted)]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {secondaryCol ? (
                <div
                  className={cn(
                    "shrink-0 text-right text-sm font-medium tabular-nums text-[var(--erp-text)]",
                    secondaryCol.className
                  )}
                >
                  {secondaryCol.cell(row)}
                </div>
              ) : null}
              {actionCol ? (
                <div className="shrink-0">{actionCol.cell(row)}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="erp-list-table w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cellClass(col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key} className={cellClass(col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <TablePagination
          meta={pagination.meta}
          onPageChange={pagination.onPageChange}
          onLimitChange={pagination.onLimitChange}
          disabled={pagination.disabled}
        />
      ) : null}
    </div>
  );
}
