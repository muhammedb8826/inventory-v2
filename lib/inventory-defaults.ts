import type { ItemType, Location, Uom } from "@/lib/types";

/** Create defaults — description is the only required field. */
export const DEFAULT_ITEM_TYPE: ItemType = "OTHER";
export const DEFAULT_OPENING_QTY = "0";
export const DEFAULT_PURCHASE_PRICE = "0";
export const DEFAULT_UNIT_CODE = "PCS";

export function findDefaultStockUomId(
  uoms: Uom[] | null | undefined
): string | null {
  if (!uoms?.length) return null;
  const pcs = uoms.find(
    (u) => u.code.toUpperCase() === DEFAULT_UNIT_CODE
  );
  if (pcs) return pcs.id;
  const base = uoms.find((u) => u.isBase);
  return base?.id ?? null;
}

/**
 * Prefer an explicit location (e.g. list filter), else first warehouse, else first location.
 */
export function findDefaultLocationId(
  locations: Location[] | null | undefined,
  preferredId?: string | null
): string {
  if (!locations?.length) return preferredId?.trim() || "";
  if (preferredId && locations.some((l) => l.id === preferredId)) {
    return preferredId;
  }
  const active = locations.filter((l) => l.isActive !== false);
  const pool = active.length > 0 ? active : locations;
  const warehouse = pool.find((l) => l.type === "WAREHOUSE");
  return warehouse?.id ?? pool[0]?.id ?? "";
}
