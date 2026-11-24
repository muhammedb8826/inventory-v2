import { api } from "@/lib/api";
import type {
  TaxDefaults,
  TaxMode,
  TaxSettings,
  UpdateTaxSettingsBody,
} from "@/lib/types";

export async function fetchTaxDefaults(): Promise<TaxDefaults> {
  return api<TaxDefaults>("/settings/tax/defaults");
}

export async function fetchTaxSettings(): Promise<TaxSettings> {
  return api<TaxSettings>("/settings/tax");
}

export async function updateTaxSettings(
  body: UpdateTaxSettingsBody
): Promise<TaxSettings> {
  return api<TaxSettings>("/settings/tax", {
    method: "PATCH",
    body,
  });
}

/** Preview tax for form totals (mirrors API computeDocumentTax). */
export function previewDocumentTax(
  subtotal: number,
  percent: number,
  mode: TaxMode,
  enabled: boolean
): { taxAmount: number; total: number } {
  const pct = !enabled || percent <= 0 ? 0 : percent;
  if (pct <= 0) return { taxAmount: 0, total: subtotal };
  if (mode === "INCLUSIVE") {
    const taxAmount = subtotal - subtotal / (1 + pct / 100);
    return { taxAmount, total: subtotal };
  }
  const taxAmount = (subtotal * pct) / 100;
  return { taxAmount, total: subtotal + taxAmount };
}
