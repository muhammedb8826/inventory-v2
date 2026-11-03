"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PAGE_SIZE_OPTIONS,
  paginationLabel,
} from "@/lib/pagination";
import type { PaginatedMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

export interface TablePaginationProps {
  meta: PaginatedMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  className?: string;
  disabled?: boolean;
}

export function TablePagination({
  meta,
  onPageChange,
  onLimitChange,
  className,
  disabled = false,
}: TablePaginationProps) {
  const { page, limit, total, totalPages } = meta;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-[var(--erp-border)] bg-[var(--erp-section-head)]/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4",
        className
      )}
    >
      <p className="text-sm text-[var(--erp-text-muted)]">
        {paginationLabel(meta)}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-4">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="rows-per-page"
            className="text-sm font-normal text-[var(--erp-text-muted)]"
          >
            Rows
          </Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger
              id="rows-per-page"
              size="sm"
              className="h-8 w-[72px] border-[var(--erp-border)] bg-[var(--erp-surface)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden size-8 border-[var(--erp-border)] bg-[var(--erp-surface)] sm:inline-flex"
            onClick={() => onPageChange(1)}
            disabled={disabled || !canPrev || total === 0}
            aria-label="First page"
          >
            <ChevronsLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 border-[var(--erp-border)] bg-[var(--erp-surface)]"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || !canPrev || total === 0}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="min-w-[72px] px-1 text-center text-sm tabular-nums text-[var(--erp-text)] sm:min-w-[88px] sm:px-2">
            {total === 0 ? "0 / 0" : `${page} / ${totalPages}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 border-[var(--erp-border)] bg-[var(--erp-surface)]"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || !canNext || total === 0}
            aria-label="Next page"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden size-8 border-[var(--erp-border)] bg-[var(--erp-surface)] sm:inline-flex"
            onClick={() => onPageChange(totalPages)}
            disabled={disabled || !canNext || total === 0}
            aria-label="Last page"
          >
            <ChevronsRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
