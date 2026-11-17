"use client";

import { Badge } from "@/components/ui/badge";
import {
  FrappeButtonLink,
  FrappeDocument,
  FrappeFormGrid,
  FrappeSection,
} from "@/components/frappe";
import { PermissionGate } from "@/components/permission-gate";
import { formatDate, formatQty } from "@/lib/format";
import { formatItemAttributeLabel } from "@/lib/item-attributes";
import { formatStockQtyLabel, formatTxnQtyLabel } from "@/lib/uom";
import type { Bom } from "@/lib/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium text-[var(--frappe-text-muted)]">
        {label}
      </p>
      <p className="text-sm text-[var(--frappe-text)]">{value}</p>
    </div>
  );
}

export function BomDetail({ bom }: { bom: Bom }) {
  const lines = bom.lines ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FrappeButtonLink href="/boms">← Back to list</FrappeButtonLink>
        <Badge
          variant={bom.isActive === false ? "secondary" : "outline"}
          className="ml-auto"
        >
          {bom.isActive === false ? "Inactive" : "Active"}
        </Badge>
        <PermissionGate permission="bom.write">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/boms/${bom.id}/edit`}>Edit</Link>
          </Button>
        </PermissionGate>
      </div>

      <FrappeDocument>
        <FrappeSection
          title={bom.name || "Bill of Materials"}
          description={
            bom.createdAt ? `Created ${formatDate(bom.createdAt)}` : undefined
          }
        >
          <FrappeFormGrid columns={2}>
            <DetailField
              label="Product"
              value={bom.finishedItem?.description ?? bom.finishedItemId}
            />
            <DetailField label="Reference" value={bom.name || "—"} />
            <DetailField
              label="Product Variant"
              value={
                bom.variantItem
                  ? formatItemAttributeLabel(bom.variantItem.attributeValues) ||
                    bom.variantItem.description
                  : "All variants"
              }
            />
            <DetailField
              label="Quantity"
              value={`${formatQty(bom.quantity ?? 1)} ${
                bom.finishedItem?.stockUom?.symbol ||
                bom.finishedItem?.unit ||
                ""
              }`.trim()}
            />
            <DetailField
              label="BoM Type"
              value={
                bom.bomType === "KIT"
                  ? "Kit (not produced)"
                  : "Manufacture this product"
              }
            />
            {bom.notes ? (
              <div className="sm:col-span-2">
                <DetailField label="Notes" value={bom.notes} />
              </div>
            ) : null}
          </FrappeFormGrid>
        </FrappeSection>

        <FrappeSection
          title="Components"
          description={`${lines.length} line${lines.length === 1 ? "" : "s"} for ${formatQty(bom.quantity ?? 1)} finished`}
        >
          {lines.length === 0 ? (
            <p className="text-sm text-[var(--frappe-text-muted)]">
              No component lines.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="frappe-list-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>SKU</th>
                    <th className="text-right tabular-nums">Qty / FG</th>
                    <th className="text-right tabular-nums">Stock qty</th>
                    <th className="text-right tabular-nums">Scrap %</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={line.id ?? `${line.componentItemId}-${i}`}>
                      <td>
                        {line.componentItem?.description ??
                          line.componentItemId}
                      </td>
                      <td className="text-[var(--frappe-text-muted)]">
                        {line.componentItem?.sku ?? "—"}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatTxnQtyLabel(line, formatQty)}
                      </td>
                      <td className="text-right tabular-nums text-[var(--frappe-text-muted)]">
                        {formatStockQtyLabel(line, formatQty)}
                      </td>
                      <td className="text-right tabular-nums">
                        {line.scrapPercent != null && line.scrapPercent !== ""
                          ? `${line.scrapPercent}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FrappeSection>
      </FrappeDocument>
    </div>
  );
}
