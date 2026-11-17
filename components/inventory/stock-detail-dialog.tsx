"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FrappeDocument,
  FrappeField,
  FrappeFormGrid,
  FrappeSection,
} from "@/components/frappe";
import { PageLoading } from "@/components/shared/page-loading";
import { api } from "@/lib/api";
import { resolveItemImageUrl } from "@/lib/inventory-media";
import { ItemImage } from "@/components/shared/item-image";
import { isLowStockRow } from "@/lib/inventory-stock";
import { itemTypeLabel } from "@/lib/item-types";
import { errorMessage, formatMoney, formatQty } from "@/lib/format";
import { formatItemStockQty, itemStockUnit } from "@/lib/uom";
import type { LowStockRecord, StockRecord } from "@/lib/types";
import { toast } from "sonner";
import { EyeIcon } from "lucide-react";

function DetailValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="min-h-8 text-sm text-[var(--frappe-text)]">{children}</p>
  );
}

export function StockDetailDialog({
  record,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  record: StockRecord;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const [detail, setDetail] = useState<StockRecord | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    if (onOpenChange) onOpenChange(nextOpen);
    else setUncontrolledOpen(nextOpen);
    if (!nextOpen) {
      setDetail(null);
      return;
    }
    setDetail(record);
    setLoading(true);
    try {
      const fresh = await api<StockRecord>(`/inventory/${record.id}`);
      setDetail(fresh);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const shown = detail ?? record;
  const imageSrc = resolveItemImageUrl(
    shown.item.imageUrl ?? shown.item.imagePath
  );
  const stockValue =
    parseFloat(shown.quantity) * parseFloat(shown.purchasePrice);
  const lowRow = shown as LowStockRecord;
  const qty = parseFloat(shown.quantity);
  const outOfStock =
    lowRow.status === "OUT_OF_STOCK" || (!Number.isNaN(qty) && qty <= 0);
  const lowStock = isLowStockRow(shown);

  const showTrigger = openProp === undefined || trigger != null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="icon" variant="ghost" aria-label="View stock">
              <EyeIcon className="size-4" />
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-3">
          <DialogTitle className="text-base">Stock details</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          {loading && !detail ? (
            <PageLoading />
          ) : (
            <FrappeDocument>
              <FrappeSection title="Item">
                <ItemImage
                  src={imageSrc}
                  alt={shown.item.description}
                  size="full"
                  className="mb-4 rounded-lg"
                  imgClassName="p-3"
                />
                <FrappeFormGrid columns={2}>
                  <FrappeField label="Description" fullWidth>
                    <DetailValue>{shown.item.description}</DetailValue>
                  </FrappeField>
                  {shown.item.parentItem ? (
                    <FrappeField label="Product" fullWidth>
                      <DetailValue>
                        {shown.item.parentItem.description}
                        <span className="ml-2 text-xs text-[var(--frappe-text-muted)]">
                          (variant)
                        </span>
                      </DetailValue>
                    </FrappeField>
                  ) : null}
                  <FrappeField label="SKU">
                    <DetailValue>{shown.item.sku || "—"}</DetailValue>
                  </FrappeField>
                  <FrappeField label="Unit">
                    <DetailValue>
                      {itemStockUnit(shown.item) || "—"}
                    </DetailValue>
                  </FrappeField>
                  <FrappeField label="Item type">
                    <DetailValue>
                      {itemTypeLabel(shown.item.itemType)}
                    </DetailValue>
                  </FrappeField>
                  <FrappeField label="Location">
                    <DetailValue>
                      {shown.location?.name
                        ? `${shown.location.name}${
                            shown.location.type
                              ? ` (${shown.location.type})`
                              : ""
                          }`
                        : "—"}
                    </DetailValue>
                  </FrappeField>
                  <FrappeField label="Attributes" fullWidth>
                    {(shown.item.attributeValues ?? []).length > 0 ? (
                      <div className="flex min-h-8 flex-wrap gap-1.5">
                        {(shown.item.attributeValues ?? []).map((value) => (
                          <Badge
                            key={value.id}
                            variant="secondary"
                            className="gap-1 text-[10px]"
                          >
                            {value.colorHex ? (
                              <span
                                className="size-2 rounded-full border border-black/10"
                                style={{ backgroundColor: value.colorHex }}
                              />
                            ) : null}
                            {value.attribute?.name
                              ? `${value.attribute.name}: ${value.name}`
                              : value.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <DetailValue>—</DetailValue>
                    )}
                  </FrappeField>
                </FrappeFormGrid>
              </FrappeSection>
              <FrappeSection title="Stock">
                <FrappeFormGrid columns={2}>
                  <FrappeField label="On hand">
                    <div className="flex min-h-8 flex-wrap items-center gap-2">
                      <span className="text-sm font-medium tabular-nums text-[var(--frappe-text)]">
                        {formatItemStockQty(
                          shown.quantity,
                          shown.item,
                          formatQty
                        )}
                      </span>
                      {outOfStock ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Out of stock
                        </Badge>
                      ) : lowStock ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Low stock
                        </Badge>
                      ) : null}
                    </div>
                  </FrappeField>
                  <FrappeField label="Reorder point">
                    <DetailValue>
                      {shown.reorderPoint != null && shown.reorderPoint !== ""
                        ? formatQty(shown.reorderPoint)
                        : "—"}
                    </DetailValue>
                  </FrappeField>
                  <FrappeField label="Purchase price">
                    <DetailValue>
                      {formatMoney(shown.purchasePrice)}
                    </DetailValue>
                  </FrappeField>
                  <FrappeField label="Stock value">
                    <DetailValue>{formatMoney(stockValue)}</DetailValue>
                  </FrappeField>
                </FrappeFormGrid>
              </FrappeSection>
            </FrappeDocument>
          )}
        </div>
        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-3">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
