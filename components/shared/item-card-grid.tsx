"use client";

import { EmptyState } from "@/components/shared/empty-state";
import {
  TablePagination,
  type TablePaginationProps,
} from "@/components/shared/table-pagination";
import { ItemImage } from "@/components/shared/item-image";
import { unwrapList } from "@/lib/list-response";
import type { PaginatedResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ItemCardGrid<T extends { id: string }>({
  rows,
  getImage,
  getTitle,
  getSubtitle,
  renderBadges,
  renderMeta,
  renderActions,
  onCardClick,
  emptyTitle = "No records",
  emptyDescription,
  pagination,
  className,
}: {
  rows: T[] | PaginatedResponse<T> | null | undefined;
  getImage: (row: T) => string | null;
  getTitle: (row: T) => React.ReactNode;
  getSubtitle?: (row: T) => React.ReactNode;
  renderBadges?: (row: T) => React.ReactNode;
  renderMeta?: (row: T) => React.ReactNode;
  renderActions?: (row: T) => React.ReactNode;
  onCardClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: Omit<TablePaginationProps, "disabled"> & { disabled?: boolean };
  className?: string;
}) {
  const list = unwrapList(rows);
  const showPagination = pagination && pagination.meta.total > 0;

  if (list.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((row) => {
          const imageSrc = getImage(row);
          const clickable = Boolean(onCardClick);
          return (
            <article
              key={row.id}
              className={cn(
                "group flex flex-col overflow-hidden rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm transition-shadow hover:shadow-md",
                clickable && "cursor-pointer"
              )}
              onClick={clickable ? () => onCardClick?.(row) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onCardClick?.(row);
                      }
                    }
                  : undefined
              }
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
            >
              <div className="relative border-b border-[var(--erp-border)]">
                <ItemImage
                  src={imageSrc}
                  size="full"
                  rounded={false}
                  className="rounded-none border-0"
                  imgClassName="p-2 transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {renderBadges ? (
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {renderBadges(row)}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm font-semibold text-[var(--erp-text)]">
                    {getTitle(row)}
                  </h3>
                  {getSubtitle ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-[var(--erp-text-muted)]">
                      {getSubtitle(row)}
                    </p>
                  ) : null}
                </div>

                {renderMeta ? (
                  <div className="mt-auto space-y-1 text-sm">{renderMeta(row)}</div>
                ) : null}

                {renderActions ? (
                  <div
                    className="flex items-center justify-end gap-0.5 border-t border-[var(--erp-border)] pt-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {renderActions(row)}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
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
