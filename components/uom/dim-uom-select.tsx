"use client";

import { useEffect, useMemo } from "react";
import { SearchSelect } from "@/components/shared/search-select";
import { formatUomLabel, lengthUoms } from "@/lib/uom";
import type { Uom } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Length UOM picker for cut W×H entry (m / cm / mm).
 * Independent of the line Unit (stock / txn UOM).
 */
export function DimUomSelect({
  value,
  onValueChange,
  uoms,
  loading,
  disabled,
  className,
}: {
  value?: string | null;
  onValueChange: (uomId: string | null) => void;
  uoms: Uom[];
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const options = useMemo(
    () =>
      lengthUoms(uoms).map((u) => ({
        value: u.id,
        label: formatUomLabel(u),
      })),
    [uoms]
  );

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
      options={options}
      placeholder={loading ? "Loading…" : "Cut in"}
      searchPlaceholder="Search unit…"
      emptyMessage="No length units."
      loading={loading}
      disabled={disabled || loading || options.length === 0}
      className={cn("h-8", className)}
    />
  );
}
