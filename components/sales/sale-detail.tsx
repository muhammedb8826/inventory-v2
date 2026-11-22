"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  FrappeDocument,
  FrappeFormGrid,
  FrappeSection,
  FrappeButtonLink,
} from "@/components/frappe";
import { SaleDocumentActions } from "@/components/transactions/document-actions";
import { CreditPaymentsPanel } from "@/components/credits/credit-payments-panel";
import { formatMoney, formatDate, formatQty } from "@/lib/format";
import { documentTotal } from "@/lib/document-utils";
import {
  formatCommissionBasis,
  formatCommissionRate,
  saleRepUser,
} from "@/lib/sale-utils";
import {
  formatStockQtyLabel,
  formatTxnQtyLabel,
  stockQtyDiffers,
} from "@/lib/uom";
import { productionStatusLabel } from "@/lib/production";
import type { Sale, SaleLine } from "@/lib/types";

function DetailField({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium text-[var(--frappe-text-muted)]">
        {label}
      </p>
      {href ? (
        <Link
          href={href}
          className="text-sm font-medium text-[var(--frappe-primary)] hover:underline"
        >
          {value}
        </Link>
      ) : (
        <p className="text-sm text-[var(--frappe-text)]">{value}</p>
      )}
    </div>
  );
}

function lineAmount(line: SaleLine) {
  const qty = parseFloat(line.quantity);
  const price = parseFloat(line.unitPrice);
  if (line.lineTotal) return line.lineTotal;
  if (line.amount) return line.amount;
  if (!Number.isNaN(qty) && !Number.isNaN(price)) {
    return String(qty * price);
  }
  return "0";
}

export function SaleDetail({
  sale,
  onRefresh,
}: {
  sale: Sale;
  onRefresh?: () => void;
}) {
  const lines = sale.lines ?? [];
  const paymentLabel = sale.paymentMethod.replace("_", " ");
  const isVoided = sale.status === "VOIDED";
  const soldBy = saleRepUser(sale);
  const credit = sale.credit ?? null;
  const stockWarnings = sale.stockWarnings ?? [];
  const productionOrders = (sale.productionOrders ?? []).filter(
    (po) => po.status !== "CANCELLED"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FrappeButtonLink href="/sales">← Back to list</FrappeButtonLink>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isVoided ? (
            <Badge variant="secondary">Voided</Badge>
          ) : (
            <Badge variant="outline">{paymentLabel}</Badge>
          )}
          <SaleDocumentActions saleId={sale.id} status={sale.status} />
        </div>
      </div>

      <FrappeDocument>
        <FrappeSection
          title="Sales invoice"
          description={
            sale.createdAt
              ? `Created ${formatDate(sale.createdAt)}`
              : undefined
          }
        >
          <FrappeFormGrid columns={2}>
            <DetailField
              label="Customer"
              value={sale.customer?.name ?? "—"}
              href={sale.customerId ? `/customers` : undefined}
            />
            <DetailField
              label="Location"
              value={sale.location?.name ?? "—"}
            />
            <DetailField label="Payment method" value={paymentLabel} />
            {sale.paymentMethod !== "CREDIT" ? (
              <DetailField
                label="Bank account"
                value={sale.bankAccount?.name ?? "—"}
              />
            ) : (
              <DetailField
                label="Credit due date"
                value={
                  sale.creditDueDate || credit?.dueDate
                    ? formatDate(sale.creditDueDate ?? credit?.dueDate)
                    : "—"
                }
              />
            )}
            {credit ? (
              <DetailField
                label="Credit balance"
                value={formatMoney(credit.balance ?? credit.amount)}
                href={`/credits/customers/${credit.id}`}
              />
            ) : null}
            <DetailField
              label="Total amount"
              value={formatMoney(documentTotal(sale))}
            />
            {soldBy ? (
              <DetailField label="Sales rep" value={soldBy.fullName} />
            ) : null}
            {sale.commissionBasis ? (
              <DetailField
                label="Commission basis"
                value={formatCommissionBasis(sale.commissionBasis)}
              />
            ) : null}
            {formatCommissionRate(
              sale.commissionPercent,
              sale.commissionBasis
            ) ? (
              <DetailField
                label="Commission rate"
                value={
                  formatCommissionRate(
                    sale.commissionPercent,
                    sale.commissionBasis
                  )!
                }
              />
            ) : null}
            {sale.commissionAmount ? (
              <DetailField
                label="Commission amount"
                value={formatMoney(sale.commissionAmount)}
              />
            ) : null}
            {sale.createdBy && sale.createdBy.id !== soldBy?.id ? (
              <DetailField
                label="Entered by"
                value={sale.createdBy.fullName}
              />
            ) : null}
            <DetailField
              label="Document ID"
              value={
                <span className="font-mono text-xs">{sale.id}</span>
              }
            />
            {sale.notes ? (
              <div className="sm:col-span-2">
                <DetailField label="Notes" value={sale.notes} />
              </div>
            ) : null}
          </FrappeFormGrid>
        </FrappeSection>

        {stockWarnings.length > 0 ? (
          <FrappeSection
            title="Stock shortages"
            description="Posted with insufficient stock"
          >
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--frappe-text)]">
              {stockWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </FrappeSection>
        ) : null}

        {productionOrders.length > 0 ? (
          <FrappeSection
            title="Production orders"
            description="Created for Manufacture BoM shortages"
          >
            <div className="overflow-x-auto">
              <table className="frappe-list-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right tabular-nums">Planned</th>
                    <th>Status</th>
                    <th>BoM</th>
                  </tr>
                </thead>
                <tbody>
                  {productionOrders.map((po) => (
                    <tr key={po.id}>
                      <td>
                        <Link
                          href={`/production-orders/${po.id}`}
                          className="text-[var(--frappe-primary)] hover:underline"
                        >
                          {po.finishedItem?.description ??
                            po.finishedItemId ??
                            po.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="text-right tabular-nums">
                        {formatQty(po.quantityPlanned)}
                      </td>
                      <td>{productionStatusLabel(po.status)}</td>
                      <td className="text-[var(--frappe-text-muted)]">
                        {po.bom?.name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FrappeSection>
        ) : null}

        <FrappeSection
          title="Items"
          description={`${lines.length} line${lines.length === 1 ? "" : "s"}`}
        >
          {lines.length === 0 ? (
            <p className="text-sm text-[var(--frappe-text-muted)]">
              No line items on this sale.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="frappe-list-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>SKU</th>
                    <th>Cut</th>
                    <th className="text-right tabular-nums">Qty</th>
                    <th className="text-right tabular-nums">Stock qty</th>
                    <th className="text-right tabular-nums">Rate</th>
                    <th className="text-right tabular-nums">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={line.id ?? `${line.itemId}-${i}`}>
                      <td>{line.item?.description ?? line.itemId}</td>
                      <td className="text-[var(--frappe-text-muted)]">
                        {line.item?.sku ?? "—"}
                      </td>
                      <td className="text-[var(--frappe-text-muted)]">
                        {line.dimWidth && line.dimHeight
                          ? `${line.dimWidth} × ${line.dimHeight}${
                              line.dimPieces && line.dimPieces !== "1.000"
                                ? ` × ${line.dimPieces}`
                                : ""
                            }`
                          : "—"}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatTxnQtyLabel(line, formatQty)}
                      </td>
                      <td className="text-right tabular-nums text-[var(--frappe-text-muted)]">
                        {stockQtyDiffers(line) || line.stockQuantity
                          ? formatStockQtyLabel(line, formatQty)
                          : "—"}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatMoney(line.unitPrice)}
                      </td>
                      <td className="text-right tabular-nums font-medium">
                        {formatMoney(lineAmount(line))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--frappe-section-head)]">
                    <td
                      colSpan={6}
                      className="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--frappe-text-muted)]"
                    >
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">
                      {formatMoney(documentTotal(sale))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </FrappeSection>

        {credit && !isVoided ? (
          <CreditPaymentsPanel
            type="customer"
            credit={credit}
            onCreditChange={onRefresh}
            detailHref={`/credits/customers/${credit.id}`}
          />
        ) : null}
      </FrappeDocument>
    </div>
  );
}
