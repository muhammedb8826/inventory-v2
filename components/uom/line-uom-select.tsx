"use client";

import { useEffect, useMemo } from "react";
import { SearchSelect } from "@/components/shared/search-select";
import { formatUomLabel, uomsForItem } from "@/lib/uom";
import type { Item, Uom } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Searchable line UOM picker.
 * Only units in the item's stock-UOM category (plus Length↔Area when width is set).
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
    return uomsForItem(item, uoms).map((u) => ({
      value: u.id,
      label: formatUomLabel(u),
    }));
  }, [item, uoms]);

  const noItem = !item?.id;
  const noCategory = Boolean(item?.id) && options.length === 0;

  // Drop invalid selection if it falls outside the allowed category.
  useEffect(() => {
    if (!value) return;
    if (options.some((o) => o.value === value)) return;
    onValueChange(options[0]?.value ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to value/options
  }, [value, options]);

  return (
    <SearchSelect
      value={value || ""}
      onValueChange={(v) => onValueChange(v || null)}
      options={options.map(({ value: v, label }) => ({ value: v, label }))}
      placeholder={
        loading
          ? "Loading…"
          : noItem
            ? "Item first"
            : noCategory
              ? "No UOM category"
              : "UOM"
      }
      searchPlaceholder="Search unit…"
      emptyMessage={
        noCategory
          ? "Set a stock UOM on the item first."
          : "No units in this category."
      }
      loading={loading}
      disabled={disabled || loading || noItem || noCategory}
      className={cn("h-8", className)}
    />
  );
}
