"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchUoms, formatUomLabel } from "@/lib/uom";
import type { Uom } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";

export function UomSelect({
  value,
  onValueChange,
  categoryId,
  placeholder = "Select unit",
  allowEmpty,
  emptyLabel = "None",
  disabled,
}: {
  value?: string | null;
  onValueChange: (uomId: string | null) => void;
  categoryId?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const { data: uoms, loading } = useFetch(
    () => fetchUoms(categoryId),
    [categoryId]
  );

  const list = (uoms ?? []) as Uom[];

  return (
    <Select
      value={value || (allowEmpty ? "__none__" : undefined)}
      onValueChange={(v) => onValueChange(v === "__none__" ? null : v)}
      disabled={disabled || loading}
    >
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? (
          <SelectItem value="__none__">{emptyLabel}</SelectItem>
        ) : null}
        {list.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {formatUomLabel(u)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
