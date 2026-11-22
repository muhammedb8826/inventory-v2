import { api } from "@/lib/api";
import type { Item, ItemUom, Uom, UomCategory } from "@/lib/types";

export async function fetchUomCategories(
  includeInactive = false
): Promise<UomCategory[]> {
  const q = includeInactive ? "?includeInactive=true" : "";
  return api<UomCategory[]>(`/uom/categories${q}`);
}

export async function fetchUomCategory(id: string): Promise<UomCategory> {
  return api<UomCategory>(`/uom/categories/${id}`);
}

export async function fetchUoms(
  categoryId?: string,
  includeInactive = false
): Promise<Uom[]> {
  const params = new URLSearchParams();
  if (categoryId) params.set("categoryId", categoryId);
  if (includeInactive) params.set("includeInactive", "true");
  const q = params.toString() ? `?${params}` : "";
  return api<Uom[]>(`/uom/units${q}`);
}

export async function createUomCategory(body: {
  code: string;
  name: string;
  description?: string;
  hasConstantWidth?: boolean;
}): Promise<UomCategory> {
  return api<UomCategory>("/uom/categories", { method: "POST", body });
}

export async function updateUomCategory(
  id: string,
  body: {
    code?: string;
    name?: string;
    description?: string | null;
    isActive?: boolean;
    hasConstantWidth?: boolean;
  }
): Promise<UomCategory> {
  return api<UomCategory>(`/uom/categories/${id}`, { method: "PATCH", body });
}

export async function deleteUomCategory(
  id: string
): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/uom/categories/${id}`, {
    method: "DELETE",
  });
}

export async function createUom(body: {
  categoryId: string;
  code: string;
  name: string;
  symbol: string;
  conversionFactor: number;
  isBase?: boolean;
  isActive?: boolean;
}): Promise<Uom> {
  return api<Uom>("/uom/units", { method: "POST", body });
}

export async function updateUom(
  id: string,
  body: {
    categoryId?: string;
    code?: string;
    name?: string;
    symbol?: string;
    conversionFactor?: number;
    isBase?: boolean;
    isActive?: boolean;
  }
): Promise<Uom> {
  return api<Uom>(`/uom/units/${id}`, { method: "PATCH", body });
}

export async function deleteUom(id: string): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/uom/units/${id}`, { method: "DELETE" });
}

export async function fetchItemUoms(itemId: string): Promise<ItemUom[]> {
  return api<ItemUom[]>(`/uom/items/${itemId}`);
}

/** Default transaction UOM for a document line. */
export function defaultUomIdForItem(
  item: Item | undefined | null,
  preferred: "purchase" | "sales" | "stock" = "stock"
): string | null {
  if (!item) return null;
  if (preferred === "purchase") {
    return item.purchaseUomId ?? item.stockUomId ?? null;
  }
  if (preferred === "sales") {
    return item.salesUomId ?? item.stockUomId ?? null;
  }
  return item.stockUomId ?? null;
}

/**
 * Category id for an item's stock UOM (units outside this category must not mix,
 * except Length↔Area when `uomWidth` is set).
 */
export function itemStockUomCategoryId(
  item: Item | undefined | null,
  uoms: Uom[] = []
): string | null {
  if (!item) return null;
  return (
    item.stockUom?.categoryId ??
    item.stockUom?.category?.id ??
    uoms.find((u) => u.id === item.stockUomId)?.categoryId ??
    null
  );
}

/** Stock UOM category code (AREA, LENGTH, UNIT, …). */
export function itemStockUomCategoryCode(
  item: Item | undefined | null,
  uoms: Uom[] = []
): string | null {
  if (!item) return null;
  const fromRelation = item.stockUom?.category?.code;
  if (fromRelation) return fromRelation;
  const stockUom =
    item.stockUom ?? uoms.find((u) => u.id === item.stockUomId) ?? null;
  return stockUom?.category?.code ?? null;
}

/** Whether the item's stock UOM category allows constant width / W×H. */
export function itemHasConstantWidthCategory(
  item: Item | undefined | null,
  uoms: Uom[] = []
): boolean {
  if (!item) return false;
  if (item.stockUom?.category?.hasConstantWidth) return true;
  const stockUom =
    item.stockUom ?? uoms.find((u) => u.id === item.stockUomId) ?? null;
  if (stockUom?.category?.hasConstantWidth) return true;
  // Resolve category from flat UOM list when nested category missing
  const catId =
    stockUom?.categoryId ??
    item.stockUom?.categoryId ??
    itemStockUomCategoryId(item, uoms);
  if (catId) {
    const peer = uoms.find((u) => u.categoryId === catId && u.category);
    if (peer?.category?.hasConstantWidth) return true;
  }
  // Fallback: classic AREA stock before/without migration flag populated
  return itemStockUomCategoryCode(item, uoms) === "AREA";
}

/**
 * W×H cut columns on sales/purchases/BoM when stock UOM category has constant width.
 */
export function itemAllowsCuts(
  item: Item | undefined | null,
  uoms: Uom[] = []
): boolean {
  return itemHasConstantWidthCategory(item, uoms);
}

/** Length UOMs for cut dimension entry (m, cm, mm, …). */
export function lengthUoms(uoms: Uom[] = []): Uom[] {
  return uoms.filter(
    (u) => u.isActive !== false && u.category?.code === "LENGTH"
  );
}

/** Prefer meters as default cut-dimension UOM. */
export function findDefaultLengthUomId(uoms: Uom[] = []): string | null {
  const length = lengthUoms(uoms);
  return (
    length.find((u) => u.code === "M" || u.symbol === "m")?.id ??
    length.find((u) => u.isBase)?.id ??
    length[0]?.id ??
    null
  );
}

/**
 * Allowed UOM category ids for document lines / sales-purchase defaults.
 * Same category only; Length↔Area allowed when item has a positive width.
 */
export function allowedUomCategoryIds(
  item: Item | undefined | null,
  uoms: Uom[] = []
): string[] {
  const stockCat = itemStockUomCategoryId(item, uoms);
  if (!stockCat) return [];

  const ids = new Set<string>([stockCat]);
  const width =
    item?.uomWidth != null ? parseFloat(String(item.uomWidth)) : NaN;
  if (!Number.isFinite(width) || width <= 0) return [...ids];

  const stockUom =
    item?.stockUom ?? uoms.find((u) => u.id === item?.stockUomId) ?? null;
  const stockHasWidth =
    Boolean(stockUom?.category?.hasConstantWidth) ||
    itemHasConstantWidthCategory(item, uoms);

  if (stockHasWidth) {
    const length = uoms.find(
      (u) => u.category?.code === "LENGTH" && !u.category?.hasConstantWidth
    );
    if (length?.categoryId) ids.add(length.categoryId);
  } else {
    const area = uoms.find((u) => u.category?.hasConstantWidth);
    if (area?.categoryId) ids.add(area.categoryId);
  }

  return [...ids];
}

/** Units allowed for an item (never mixes unrelated categories). */
export function uomsForItem(
  item: Item | undefined | null,
  uoms: Uom[]
): Uom[] {
  const allowed = new Set(allowedUomCategoryIds(item, uoms));
  if (allowed.size === 0) return [];
  return uoms
    .filter((u) => allowed.has(u.categoryId))
    .sort((a, b) => {
      if (a.isBase && !b.isBase) return -1;
      if (!a.isBase && b.isBase) return 1;
      return (a.symbol || a.name).localeCompare(b.symbol || b.name);
    });
}

/** Compact label for line grids. */
export function formatUomSymbol(uom: Uom): string {
  return uom.symbol || uom.name || uom.code;
}

/** Stock UOM symbol for inventory rows / items. */
export function itemStockUnit(item?: {
  unit?: string | null;
  stockUom?: { symbol?: string | null } | null;
} | null): string {
  return item?.stockUom?.symbol || item?.unit || "";
}

export function formatItemStockQty(
  qty: string | number | undefined | null,
  item: { unit?: string | null; stockUom?: { symbol?: string | null } | null } | null | undefined,
  formatQty: (v: string | number | undefined) => string
): string {
  if (qty === undefined || qty === null || qty === "") return "—";
  const unit = itemStockUnit(item);
  return `${formatQty(qty)}${unit ? ` ${unit}` : ""}`;
}

/** Stock qty plus linear equivalent when API provided quantityLinear. */
export function formatItemStockQtyWithLinear(
  record: {
    quantity?: string | number | null;
    quantityLinear?: string | number | null;
    linearUomSymbol?: string | null;
    item?: {
      unit?: string | null;
      stockUom?: { symbol?: string | null } | null;
    } | null;
  },
  formatQty: (v: string | number | undefined) => string
): string {
  const primary = formatItemStockQty(record.quantity, record.item, formatQty);
  if (
    record.quantityLinear == null ||
    record.quantityLinear === "" ||
    !record.linearUomSymbol
  ) {
    return primary;
  }
  return `${primary} (≈ ${formatQty(record.quantityLinear)} ${record.linearUomSymbol})`;
}

type LineQtySource = {
  quantity?: string | number | null;
  stockQuantity?: string | number | null;
  uom?: { symbol?: string | null } | null;
  uomId?: string | null;
  item?: {
    unit?: string | null;
    stockUom?: { symbol?: string | null } | null;
  } | null;
  componentItem?: {
    unit?: string | null;
    stockUom?: { symbol?: string | null } | null;
  } | null;
};

function stockUnitOf(line: LineQtySource): string {
  const item = line.item ?? line.componentItem;
  return item?.stockUom?.symbol || item?.unit || "";
}

function txnUnitOf(line: LineQtySource): string {
  return line.uom?.symbol || stockUnitOf(line);
}

/** "100 cm" — transaction qty + line UOM. */
export function formatTxnQtyLabel(
  line: LineQtySource,
  formatQty: (v: string | number | undefined) => string
): string {
  const qty = line.quantity;
  if (qty === undefined || qty === null || qty === "") return "—";
  const unit = txnUnitOf(line);
  return `${formatQty(qty)}${unit ? ` ${unit}` : ""}`;
}

/** "1 m" — stock qty + stock UOM (falls back to txn qty if stock missing). */
export function formatStockQtyLabel(
  line: LineQtySource,
  formatQty: (v: string | number | undefined) => string
): string {
  const qty =
    line.stockQuantity != null && line.stockQuantity !== ""
      ? line.stockQuantity
      : line.quantity;
  if (qty === undefined || qty === null || qty === "") return "—";
  const unit = stockUnitOf(line);
  return `${formatQty(qty)}${unit ? ` ${unit}` : ""}`;
}

/** True when stock qty differs from txn qty (worth showing both). */
export function stockQtyDiffers(line: LineQtySource): boolean {
  if (line.stockQuantity == null || line.stockQuantity === "") return false;
  const txn = parseFloat(String(line.quantity ?? ""));
  const stock = parseFloat(String(line.stockQuantity));
  if (!Number.isFinite(txn) || !Number.isFinite(stock)) return false;
  return Math.abs(txn - stock) > 1e-9 || txnUnitOf(line) !== stockUnitOf(line);
}

export function formatUomLabel(uom: Uom): string {
  const factor = parseFloat(uom.conversionFactor);
  const baseHint =
    !uom.isBase && Number.isFinite(factor) && factor !== 1
      ? ` · ${factor}× base`
      : uom.isBase
        ? " · base"
        : "";
  return `${uom.symbol} — ${uom.name}${baseHint}`;
}

/** Human explanation: 1 of this unit = N base units. */
export function formatConversionHint(uom: Uom, baseSymbol?: string): string {
  const factor = parseFloat(uom.conversionFactor);
  if (uom.isBase || factor === 1) return `Base unit for this category`;
  const base = baseSymbol ?? "base";
  if (!Number.isFinite(factor)) return "—";
  if (factor >= 1) return `1 ${uom.symbol} = ${trimNum(factor)} ${base}`;
  return `1 ${base} = ${trimNum(1 / factor)} ${uom.symbol}`;
}

function trimNum(n: number): string {
  return Number(n.toPrecision(9)).toString();
}
