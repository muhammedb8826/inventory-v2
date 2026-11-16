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
  /** Hide this column on small screens (still shown in desktop table) */
  hideOnMobile?: boolean;
}

function cellClass(className?: string) {
  return cn("text-left", className);
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
  /** Odoo-style list vs grid. Grid uses columns as card fields. */
  viewMode?: ListViewMode;
}) {
  const list = unwrapList(rows);
  const showPagination = pagination && pagination.meta.total > 0;
  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const actionCol = columns.find((c) => c.key === "actions");
  const mobileCols = columns.filter(
    (c) => !c.hideOnMobile && c.key !== primaryCol?.key
  );
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
              className="flex flex-col overflow-hidden rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="border-b border-[var(--erp-border)] bg-[var(--erp-section-head)] px-3 py-3">
                <div className="min-w-0 text-sm font-semibold text-[var(--erp-text)]">
                  {primaryCol ? primaryCol.cell(row) : null}
                </div>
              </div>
              {gridMetaCols.length > 0 ? (
                <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5 p-3">
                  {gridMetaCols.map((col) => (
                    <div key={col.key} className={cn("min-w-0", col.className)}>
                      <dt className="text-[10px] font-semibold tracking-wide text-[var(--erp-text-muted)] uppercase">
                        {col.header}
                      </dt>
                      <dd className="mt-0.5 text-sm text-[var(--erp-text)]">
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {actionCol ? (
                <div className="mt-auto flex items-center justify-end gap-0.5 border-t border-[var(--erp-border)] px-2 py-1.5">
                  {actionCol.cell(row)}
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {showPagination ? (
          <div className="overflow-hidden rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm">
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
    <div className="overflow-hidden rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm">
      {/* Mobile cards */}
      <div className="divide-y divide-[var(--erp-border)] md:hidden">
        {list.map((row) => (
          <div key={row.id} className="space-y-2.5 p-4">
            {primaryCol ? (
              <div className="min-w-0 text-sm font-medium text-[var(--erp-text)]">
                {primaryCol.cell(row)}
              </div>
            ) : null}
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              {mobileCols.map((col) => (
                <div key={col.key} className={cn("min-w-0", col.className)}>
                  <dt className="text-[10px] font-semibold tracking-wide text-[var(--erp-text-muted)] uppercase">
                    {col.header || "\u00a0"}
                  </dt>
                  <dd className="mt-0.5 text-sm text-[var(--erp-text)]">
                    {col.cell(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
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
