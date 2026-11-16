"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatUomSymbol } from "@/lib/uom";
import type { Item, Uom } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Compact UOM picker for document lines.
 * Prefers units in the item's stock-UOM category; falls back to all units.
 */
export function LineUomSelect({
  value,
  onValueChange,
  item,
  uoms,
  loading,
  disabled,
  className,
}: {
  value?: string | null;
  onValueChange: (uomId: string | null) => void;
  item?: Item | null;
  uoms: Uom[];
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const options = useMemo(() => {
    if (!uoms.length) return [] as Uom[];

    const categoryId =
      item?.stockUom?.categoryId ??
      item?.stockUom?.category?.id ??
      uoms.find((u) => u.id === item?.stockUomId)?.categoryId ??
      uoms.find((u) => u.id === item?.salesUomId)?.categoryId ??
      uoms.find((u) => u.id === item?.purchaseUomId)?.categoryId ??
      null;

    let list = categoryId
      ? uoms.filter((u) => u.categoryId === categoryId)
      : [...uoms];

    const ensure = (id?: string | null) => {
      if (!id) return;
      if (list.some((u) => u.id === id)) return;
      const found = uoms.find((u) => u.id === id);
      if (found) list = [...list, found];
    };
    ensure(item?.stockUomId);
    ensure(item?.salesUomId);
    ensure(item?.purchaseUomId);
    ensure(value);

    return list.sort((a, b) => {
      if (a.isBase && !b.isBase) return -1;
      if (!a.isBase && b.isBase) return 1;
      return (a.symbol || a.name).localeCompare(b.symbol || b.name);
    });
  }, [uoms, item, value]);

  const noItem = !item?.id;

  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onValueChange(v || null)}
      disabled={disabled || loading || noItem || options.length === 0}
    >
      <SelectTrigger className={cn("h-8", className)}>
        <SelectValue
          placeholder={
            loading ? "…" : noItem ? "Item first" : options.length ? "UOM" : "—"
          }
        />
      </SelectTrigger>
      <SelectContent>
        {options.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {formatUomSymbol(u)}
            {u.isBase ? " (base)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
