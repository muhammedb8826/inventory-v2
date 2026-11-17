import type { Item, ProductAttributeValue } from "@/lib/types";

/** Display label for selected attribute values, e.g. "Red / S". */
export function formatItemAttributeLabel(
  values: ProductAttributeValue[] | null | undefined
): string {
  if (!values?.length) return "";
  const ordered = [...values].sort((a, b) => {
    const aSeq = a.attribute?.sequence ?? 0;
    const bSeq = b.attribute?.sequence ?? 0;
    if (aSeq !== bSeq) return aSeq - bSeq;
    return (a.sequence ?? 0) - (b.sequence ?? 0);
  });
  return ordered.map((v) => v.name).join(" / ");
}

export function itemDisplayName(item: Item | null | undefined): string {
  if (!item) return "—";
  return item.description || "—";
}
