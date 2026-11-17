import { api } from "@/lib/api";
import type { Item } from "@/lib/types";

export interface BomCatalog {
  products: Item[];
  components: Item[];
  variants: Item[];
}

export function fetchBomCatalog(): Promise<BomCatalog> {
  return api<BomCatalog>("/boms/catalog/items");
}

export function itemOptionLabel(item: Item): string {
  return item.sku
    ? `${item.description} (${item.sku})`
    : item.description;
}
