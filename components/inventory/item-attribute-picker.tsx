"use client";

import Link from "next/link";
import type { ProductAttribute, ProductAttributeValue } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Single-select: one value id per attribute (edit / simple item). */
export type AttributeSelections = Record<string, string>;

/** Multi-select: many value ids per attribute (variant generation). */
export type MultiAttributeSelections = Record<string, string[]>;

export function selectionsFromAttributeValues(
  values:
    | { id: string; attributeId?: string; attribute?: { id: string } | null }[]
    | null
    | undefined
): AttributeSelections {
  const next: AttributeSelections = {};
  for (const value of values ?? []) {
    const attributeId = value.attributeId ?? value.attribute?.id;
    if (attributeId && value.id) next[attributeId] = value.id;
  }
  return next;
}

export function attributeValueIdsFromSelections(
  selections: AttributeSelections
): string[] {
  return Object.values(selections).filter(Boolean);
}

export function variantAttributesFromMulti(
  selections: MultiAttributeSelections
): { attributeId: string; valueIds: string[] }[] {
  return Object.entries(selections)
    .filter(([, ids]) => ids.length > 0)
    .map(([attributeId, valueIds]) => ({ attributeId, valueIds }));
}

export function countVariantCombinations(
  selections: MultiAttributeSelections
): number {
  const counts = Object.values(selections)
    .map((ids) => ids.length)
    .filter((n) => n > 0);
  if (counts.length === 0) return 0;
  return counts.reduce((acc, n) => acc * n, 1);
}

function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, curr) =>
      acc.flatMap((prefix) => curr.map((item) => [...prefix, item])),
    [[]]
  );
}

/** Preview rows for multi-select combinations (ordered by attribute sequence). */
export function previewVariantCombinations(
  attributes: ProductAttribute[] | null | undefined,
  selections: MultiAttributeSelections,
  baseName: string,
  baseSku?: string
): { label: string; sku: string | null; valueNames: string[] }[] {
  const ordered = (attributes ?? [])
    .filter((a) => (selections[a.id] ?? []).length > 0)
    .sort(
      (a, b) =>
        (a.sequence ?? 0) - (b.sequence ?? 0) || a.name.localeCompare(b.name)
    );

  const valueArrays: ProductAttributeValue[][] = ordered.map((attr) => {
    const selected = new Set(selections[attr.id] ?? []);
    return (attr.values ?? [])
      .filter((v) => selected.has(v.id) && v.isActive !== false)
      .sort(
        (a, b) =>
          (a.sequence ?? 0) - (b.sequence ?? 0) || a.name.localeCompare(b.name)
      );
  });

  if (valueArrays.length === 0) return [];

  const combos = cartesianProduct(valueArrays);
  const skuBase = baseSku?.trim()
    ? baseSku
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : null;

  return combos.map((combo) => {
    const valueNames = combo.map((v) => v.name);
    const codes = combo.map((v) =>
      (v.code || v.name)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    );
    return {
      label: `${baseName.trim() || "Item"} (${valueNames.join(", ")})`,
      sku: skuBase ? `${skuBase}-${codes.join("-")}` : null,
      valueNames,
    };
  });
}

export function ItemAttributePicker({
  attributes,
  selections,
  onChange,
  multiSelections,
  onMultiChange,
  mode = "single",
  compact,
}: {
  attributes: ProductAttribute[] | null | undefined;
  selections?: AttributeSelections;
  onChange?: (next: AttributeSelections) => void;
  multiSelections?: MultiAttributeSelections;
  onMultiChange?: (next: MultiAttributeSelections) => void;
  mode?: "single" | "multiple";
  compact?: boolean;
}) {
  if (!attributes?.length) {
    return (
      <div
        className={cn(
          "rounded border border-dashed border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-3 py-4 text-center",
          compact ? "text-xs" : "px-4 py-8 text-sm"
        )}
      >
        <p className="text-[var(--frappe-text)]">No attributes configured yet.</p>
        <Link
          href="/settings/attributes"
          className="mt-2 inline-block text-[var(--frappe-primary)] hover:underline"
        >
          Manage attributes
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", !compact && "sm:grid-cols-2")}>
      {attributes.map((attr) => {
        const values = (attr.values ?? []).filter((v) => v.isActive !== false);
        const selectedSingle = selections?.[attr.id] ?? "";
        const selectedMulti = multiSelections?.[attr.id] ?? [];
        const hasSelection =
          mode === "multiple"
            ? selectedMulti.length > 0
            : Boolean(selectedSingle);

        return (
          <div
            key={attr.id}
            className="rounded border border-[var(--frappe-border)] bg-[var(--frappe-surface)] p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--frappe-text)]">
                {attr.name}
                {mode === "multiple" ? (
                  <span className="ml-1 text-[11px] font-normal text-[var(--frappe-text-muted)]">
                    (multi)
                  </span>
                ) : null}
              </p>
              {hasSelection ? (
                <button
                  type="button"
                  className="text-[11px] text-[var(--frappe-text-muted)] hover:text-[var(--frappe-primary)] hover:underline"
                  onClick={() => {
                    if (mode === "multiple" && onMultiChange && multiSelections) {
                      const next = { ...multiSelections };
                      delete next[attr.id];
                      onMultiChange(next);
                    } else if (onChange && selections) {
                      const next = { ...selections };
                      delete next[attr.id];
                      onChange(next);
                    }
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
            {values.length === 0 ? (
              <p className="text-xs text-[var(--frappe-text-muted)]">
                No values — add them in Settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {values.map((v) => {
                  const active =
                    mode === "multiple"
                      ? selectedMulti.includes(v.id)
                      : selectedSingle === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        if (
                          mode === "multiple" &&
                          onMultiChange &&
                          multiSelections
                        ) {
                          const current = multiSelections[attr.id] ?? [];
                          const nextIds = current.includes(v.id)
                            ? current.filter((id) => id !== v.id)
                            : [...current, v.id];
                          const next = { ...multiSelections };
                          if (nextIds.length === 0) delete next[attr.id];
                          else next[attr.id] = nextIds;
                          onMultiChange(next);
                          return;
                        }
                        if (!onChange || !selections) return;
                        const next = { ...selections };
                        if (next[attr.id] === v.id) delete next[attr.id];
                        else next[attr.id] = v.id;
                        onChange(next);
                      }}
                      className={
                        active
                          ? "inline-flex items-center gap-1.5 rounded border border-[var(--frappe-primary)] bg-[var(--frappe-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--frappe-primary)]"
                          : "inline-flex items-center gap-1.5 rounded border border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-2.5 py-1 text-xs text-[var(--frappe-text)] hover:border-[var(--frappe-primary)]"
                      }
                    >
                      {v.colorHex ? (
                        <span
                          className="size-2.5 rounded-full border border-black/10"
                          style={{ backgroundColor: v.colorHex }}
                        />
                      ) : null}
                      {v.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
