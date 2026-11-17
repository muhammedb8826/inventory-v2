"use client";

import { useEffect, useMemo } from "react";
import { SearchSelect } from "@/components/shared/search-select";
import { fetchUoms, formatUomLabel } from "@/lib/uom";
import type { Uom } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";

/**
 * Searchable UOM picker.
 * Pass `categoryId` to lock options to one category (industry-safe).
 */
export function UomSelect({
  value,
  onValueChange,
  categoryId,
  placeholder = "Select unit",
  allowEmpty,
  emptyLabel = "None",
  disabled,
  /** When true with no categoryId, show nothing instead of all units. */
  requireCategory = false,
}: {
  value?: string | null;
  onValueChange: (uomId: string | null) => void;
  categoryId?: string | null;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  requireCategory?: boolean;
}) {
  const locked = Boolean(categoryId);
  const { data: uoms, loading } = useFetch(
    () => {
      if (requireCategory && !categoryId) {
        return Promise.resolve([] as Uom[]);
      }
      return fetchUoms(categoryId || undefined);
    },
    [categoryId, requireCategory]
  );

  const list = useMemo(() => {
    const rows = (uoms ?? []) as Uom[];
    if (locked) {
      return rows.filter((u) => u.categoryId === categoryId);
    }
    return rows;
  }, [uoms, locked, categoryId]);

  const options = useMemo(() => {
    const mapped = list.map((u) => ({
      value: u.id,
      label: formatUomLabel(u),
    }));
    if (allowEmpty) {
      return [{ value: "__none__", label: emptyLabel }, ...mapped];
    }
    return mapped;
  }, [list, allowEmpty, emptyLabel]);

  useEffect(() => {
    if (!value) return;
    if (allowEmpty && value === "") return;
    if (options.some((o) => o.value === value)) return;
    // Selection left the allowed category — clear or fall back.
    onValueChange(allowEmpty ? null : options[0]?.value ?? null);
  }, [value, options, allowEmpty, onValueChange]);

  const selectValue =
    !value && allowEmpty ? "__none__" : value || "";

  return (
    <SearchSelect
      value={selectValue}
      onValueChange={(v) =>
        onValueChange(v === "__none__" || !v ? null : v)
      }
      options={options}
      placeholder={
        loading
          ? "Loading…"
          : requireCategory && !categoryId
            ? "Select stock UOM first"
            : placeholder
      }
      searchPlaceholder="Search unit…"
      emptyMessage={
        requireCategory && !categoryId
          ? "Choose stock UOM to see units in that category."
          : "No units found."
      }
      loading={loading}
      disabled={
        disabled ||
        loading ||
        (requireCategory && !categoryId)
      }
    />
  );
}
