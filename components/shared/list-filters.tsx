"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { FilterIcon, XIcon } from "lucide-react";

export type ListFilterChip = {
  id: string;
  label: string;
  onRemove?: () => void;
};

/**
 * Modern list filtering: compact search + filter button + chips,
 * with advanced fields in a right-side sheet (no wrapping/overlap).
 */
export function ListFilters({
  search,
  children,
  chips = [],
  onClearAll,
  title = "Filters",
  description = "Narrow the list. Changes apply immediately.",
  className,
}: {
  /** Always-visible quick search (or other primary controls) */
  search?: React.ReactNode;
  /** Advanced filter fields rendered inside the side sheet */
  children?: React.ReactNode;
  chips?: ListFilterChip[];
  onClearAll?: () => void;
  title?: string;
  description?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasSheet = Boolean(children);
  const activeCount = chips.length;

  return (
    <section className={cn("mb-3 space-y-2 sm:mb-4", className)}>
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-2 shadow-sm sm:flex-row sm:items-center sm:gap-3 sm:p-2.5">
        <div className="min-w-0 flex-1">{search}</div>
        {hasSheet ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0 gap-2 border-[var(--erp-border)]"
            onClick={() => setOpen(true)}
          >
            <FilterIcon className="size-4" />
            Filters
            {activeCount > 0 ? (
              <Badge className="h-5 min-w-5 rounded-full bg-[var(--erp-accent)] px-1.5 text-[10px] text-white hover:bg-[var(--erp-accent)]">
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        ) : null}
      </div>

      {activeCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-0.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.onRemove}
              className={cn(
                "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-[var(--erp-border)] bg-[var(--erp-surface)] px-2.5 text-xs text-[var(--erp-text)]",
                chip.onRemove && "hover:border-[var(--erp-accent)] hover:text-[var(--erp-accent)]"
              )}
            >
              <span className="truncate">{chip.label}</span>
              {chip.onRemove ? <XIcon className="size-3 shrink-0 opacity-70" /> : null}
            </button>
          ))}
          {onClearAll ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-[var(--erp-text-muted)]"
              onClick={onClearAll}
            >
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}

      {hasSheet ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          >
            <SheetHeader className="border-b border-[var(--erp-border)] px-5 py-4 text-left">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 gap-4">{children}</div>
            </div>
            <SheetFooter className="mt-auto gap-2 border-t border-[var(--erp-border)] bg-[var(--erp-section-head)]/50 px-5 py-4 sm:flex-row sm:justify-between">
              {onClearAll ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onClearAll();
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  );
}
