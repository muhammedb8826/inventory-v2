import type { StockMovementRefType } from "@/lib/types";
import { notificationHref } from "@/lib/notification-routes";

export const STOCK_MOVEMENT_REF_OPTIONS: {
  value: StockMovementRefType;
  label: string;
}[] = [
  { value: "sale", label: "Sale" },
  { value: "purchase", label: "Purchase" },
  { value: "stock_transfer", label: "Transfer" },
  { value: "stock_adjustment", label: "Adjustment" },
  { value: "production", label: "Production" },
  { value: "opening", label: "Opening" },
];

export function stockMovementRefLabel(
  refType: StockMovementRefType | string | null | undefined
): string {
  if (!refType) return "—";
  return (
    STOCK_MOVEMENT_REF_OPTIONS.find((o) => o.value === refType)?.label ??
    String(refType).replace(/_/g, " ")
  );
}

export function stockMovementHref(
  refType?: StockMovementRefType | null,
  refId?: string | null
): string | null {
  if (!refType || !refId) return null;
  if (refType === "opening") return null;
  if (refType === "stock_adjustment") return null;
  return notificationHref(refType, refId);
}
