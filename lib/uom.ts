import { api } from "@/lib/api";
import type { Uom, UomCategory } from "@/lib/types";

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
  }
): Promise<UomCategory> {
  return api<UomCategory>(`/uom/categories/${id}`, { method: "PATCH", body });
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
