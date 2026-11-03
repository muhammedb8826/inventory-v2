"use client";

import { EmptyState } from "@/components/shared/empty-state";
import {
  TablePagination,
  type TablePaginationProps,
} from "@/components/shared/table-pagination";
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
}: {
  columns: Column<T>[];
  rows: T[] | PaginatedResponse<T> | null | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: Omit<TablePaginationProps, "disabled"> & { disabled?: boolean };
}) {
  const list = unwrapList(rows);
  const showPagination = pagination && pagination.meta.total > 0;
  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const mobileCols = columns.filter(
    (c) => !c.hideOnMobile && c.key !== primaryCol?.key
  );

  if (list.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
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
