"use client";

import { LayoutGridIcon, ListIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ListViewMode } from "@/hooks/use-list-view-mode";
import { cn } from "@/lib/utils";

export function ListGridViewToggle({
  value,
  onValueChange,
  className,
}: {
  value: ListViewMode;
  onValueChange: (mode: ListViewMode) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v === "list" || v === "grid") onValueChange(v);
      }}
      variant="outline"
      size="sm"
      spacing={0}
      className={cn(
        "ml-auto border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm",
        className
      )}
      aria-label="List display mode"
    >
      <ToggleGroupItem
        value="list"
        aria-label="List view"
        className="px-2.5 data-[state=on]:bg-[var(--qenenia-blue-light)] data-[state=on]:text-[var(--qenenia-navy)]"
      >
        <ListIcon className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="grid"
        aria-label="Grid view"
        className="px-2.5 data-[state=on]:bg-[var(--qenenia-blue-light)] data-[state=on]:text-[var(--qenenia-navy)]"
      >
        <LayoutGridIcon className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
