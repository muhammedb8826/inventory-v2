import type { Item, StockRecord } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Product UUID from stock or line payload — never the stock row id unless it equals itemId. */
export function productItemId(source: {
  id?: string;
  itemId?: string;
  item?: Partial<Item> | null;
}): string {
  const nested = source.item?.id?.trim();
  const flat = source.itemId?.trim();
  if (nested && flat && nested !== flat && flat === source.id) {
    return nested;
  }
  return flat || nested || "";
}

export function isProductItemId(value: string | undefined | null): boolean {
  if (!value?.trim()) return false;
  return UUID_RE.test(value.trim());
}

/** Normalize item from stock/line payloads when nested `item` is partial or missing. */
export function resolveItem(itemId: string, item?: Partial<Item> | null): Item {
  const id = productItemId({ itemId, item }) || itemId;
  return {
    id,
    description: item?.description ?? id,
    sku: item?.sku,
    unit: item?.unit,
    itemType: item?.itemType,
    stockUomId: item?.stockUomId ?? null,
    salesUomId: item?.salesUomId ?? null,
    purchaseUomId: item?.purchaseUomId ?? null,
    uomWidth: item?.uomWidth ?? null,
    dimensionPriceMode: item?.dimensionPriceMode ?? null,
    dimensionUomId: item?.dimensionUomId ?? null,
    stockUom: item?.stockUom ?? null,
    salesUom: item?.salesUom ?? null,
    purchaseUom: item?.purchaseUom ?? null,
    dimensionUom: item?.dimensionUom ?? null,
    itemUoms: item?.itemUoms,
    imageUrl: item?.imageUrl,
    imagePath: item?.imagePath,
    isActive: item?.isActive,
    isTemplate: item?.isTemplate,
    parentItemId: item?.parentItemId ?? null,
    parentItem: item?.parentItem ?? null,
    variantKey: item?.variantKey ?? null,
    attributeValues: item?.attributeValues,
  };
}

/** Prefer the payload that still has UOM / catalog fields. */
export function preferRicherItem(
  current: Item | undefined,
  next: Item
): Item {
  if (!current) return next;
  const currentHasUom = Boolean(current.stockUomId || current.stockUom);
  const nextHasUom = Boolean(next.stockUomId || next.stockUom);
  if (nextHasUom && !currentHasUom) return next;
  if (currentHasUom && !nextHasUom) {
    return {
      ...next,
      stockUomId: current.stockUomId,
      salesUomId: current.salesUomId ?? next.salesUomId,
      purchaseUomId: current.purchaseUomId ?? next.purchaseUomId,
      uomWidth: current.uomWidth ?? next.uomWidth,
      stockUom: current.stockUom ?? next.stockUom,
      salesUom: current.salesUom ?? next.salesUom,
      purchaseUom: current.purchaseUom ?? next.purchaseUom,
      itemUoms: current.itemUoms ?? next.itemUoms,
    };
  }
  return {
    ...current,
    ...next,
    stockUomId: next.stockUomId ?? current.stockUomId,
    salesUomId: next.salesUomId ?? current.salesUomId,
    purchaseUomId: next.purchaseUomId ?? current.purchaseUomId,
    uomWidth: next.uomWidth ?? current.uomWidth,
    stockUom: next.stockUom ?? current.stockUom,
    salesUom: next.salesUom ?? current.salesUom,
    purchaseUom: next.purchaseUom ?? current.purchaseUom,
    itemUoms: next.itemUoms ?? current.itemUoms,
  };
}

/** Build productId → Item map for line-item selects (stock + existing lines). */
export function buildItemOptionMap(
  stock: { id?: string; itemId: string; item?: Item | null }[],
  lines: { itemId: string; item?: Item | null }[]
): Map<string, Item> {
  const map = new Map<string, Item>();
  // Stock last so inventory UOM relations win over sparse line payloads.
  for (const source of [...lines, ...stock]) {
    const itemId = productItemId(source);
    if (!isProductItemId(itemId)) continue;
    map.set(
      itemId,
      preferRicherItem(map.get(itemId), resolveItem(itemId, source.item))
    );
  }
  return map;
}

export function itemOptionsFromMap(map: Map<string, Item>) {
  return Array.from(map.entries()).map(([itemId, item]) => ({
    itemId,
    item,
    label: item.sku ? `${item.description} (${item.sku})` : item.description,
  }));
}

export function itemOptionsFromStock(stock: StockRecord[]) {
  return itemOptionsFromMap(buildItemOptionMap(stock, []));
}

export interface DocumentLineInput {
  itemId: string;
  quantity: string | number;
  unitPrice?: string | number;
  uomId?: string | null;
  width?: string | number | null;
  height?: string | number | null;
  pieces?: string | number | null;
}

export interface DocumentLineBody {
  itemId: string;
  quantity: number;
  unitPrice: number;
  uomId?: string;
  width?: number;
  height?: number;
  pieces?: number;
}

function parseOptionalPositive(
  value: string | number | null | undefined
): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

export function parseDocumentLines(
  lines: DocumentLineInput[]
): { lines: DocumentLineBody[] } | { error: string } {
  const parsed: DocumentLineBody[] = [];

  for (const line of lines) {
    const itemId = productItemId(line);
    if (!itemId) continue;
    if (!isProductItemId(itemId)) {
      return {
        error:
          "Each line must use a product from stock (select from the list — not SKU or stock row id).",
      };
    }
    const width = parseOptionalPositive(line.width);
    const height = parseOptionalPositive(line.height);
    const isCut = width != null || height != null;
    if (isCut && (width == null || height == null)) {
      return { error: "Cut lines need both width and height." };
    }
    let pieces: number | undefined;
    if (isCut) {
      const p = parseOptionalPositive(line.pieces);
      pieces = p ?? 1;
      if (pieces < 1) {
        return { error: "Pieces must be at least 1." };
      }
    }

    let quantity: number;
    if (isCut) {
      quantity = pieces!;
    } else {
      quantity =
        typeof line.quantity === "number"
          ? line.quantity
          : parseFloat(String(line.quantity));
      if (Number.isNaN(quantity) || quantity <= 0) {
        return { error: "Enter a valid quantity for each line." };
      }
    }

    const unitPriceRaw = line.unitPrice ?? "";
    const unitPrice =
      typeof unitPriceRaw === "number"
        ? unitPriceRaw
        : parseFloat(String(unitPriceRaw));
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      return { error: "Enter a valid unit price for each line." };
    }
    const entry: DocumentLineBody = { itemId, quantity, unitPrice };
    if (line.uomId) entry.uomId = line.uomId;
    if (isCut && width != null && height != null) {
      entry.width = width;
      entry.height = height;
      entry.pieces = pieces;
    }
    parsed.push(entry);
  }

  if (parsed.length === 0) {
    return { error: "Add at least one line item." };
  }

  return { lines: parsed };
}

export interface TransferLineInput {
  itemId: string;
  quantity: string | number;
}

export function parseTransferLines(
  lines: TransferLineInput[]
): { lines: { itemId: string; quantity: number }[] } | { error: string } {
  const parsed: { itemId: string; quantity: number }[] = [];

  for (const line of lines) {
    const itemId = productItemId(line);
    if (!itemId) continue;
    if (!isProductItemId(itemId)) {
      return {
        error:
          "Each line must use a product from stock (select from the list — not SKU or stock row id).",
      };
    }
    const quantity =
      typeof line.quantity === "number"
        ? line.quantity
        : parseFloat(line.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return { error: "Enter a valid quantity for each line." };
    }
    parsed.push({ itemId, quantity });
  }

  if (parsed.length === 0) {
    return { error: "Add at least one line item." };
  }

  return { lines: parsed };
}
