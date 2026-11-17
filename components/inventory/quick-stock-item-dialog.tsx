"use client";

import { useEffect, useState } from "react";
import { FrappeButtonPrimary, FrappeButtonSecondary } from "@/components/frappe";
import {
  QuickCreateTrigger,
} from "@/components/shared/quick-create-trigger";
import {
  QuickCreateDialogShell,
  useQuickCreateDialog,
  bindQuickCreateTrigger,
} from "@/components/shared/quick-create-dialog-shell";
import { UomSelect } from "@/components/uom/uom-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import {
  DEFAULT_ITEM_TYPE,
  DEFAULT_OPENING_QTY,
  DEFAULT_PURCHASE_PRICE,
  findDefaultStockUomId,
} from "@/lib/inventory-defaults";
import { reorderPointBodyValue } from "@/lib/inventory-stock";
import { ITEM_TYPE_OPTIONS } from "@/lib/item-types";
import { errorMessage } from "@/lib/format";
import { fetchUoms } from "@/lib/uom";
import type { ItemType, StockRecord } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";

function resetQuickCreateFields(setters: {
  setDescription: (v: string) => void;
  setSku: (v: string) => void;
  setStockUomId: (v: string | null) => void;
  setItemType: (v: ItemType) => void;
  setQuantity: (v: string) => void;
  setPurchasePrice: (v: string) => void;
  setReorderPoint: (v: string) => void;
  defaultStockUomId?: string | null;
}) {
  setters.setDescription("");
  setters.setSku("");
  setters.setStockUomId(setters.defaultStockUomId ?? null);
  setters.setItemType(DEFAULT_ITEM_TYPE);
  setters.setQuantity(DEFAULT_OPENING_QTY);
  setters.setPurchasePrice(DEFAULT_PURCHASE_PRICE);
  setters.setReorderPoint("");
}

export function QuickStockItemDialog({
  locationId,
  onCreated,
  trigger,
  disabled,
}: {
  locationId: string;
  onCreated: (record: StockRecord) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}) {
  const { open, setOpen, onOpenChange } = useQuickCreateDialog();
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [stockUomId, setStockUomId] = useState<string | null>(null);
  const [itemType, setItemType] = useState<ItemType>(DEFAULT_ITEM_TYPE);
  const [quantity, setQuantity] = useState(DEFAULT_OPENING_QTY);
  const [purchasePrice, setPurchasePrice] = useState(DEFAULT_PURCHASE_PRICE);
  const [reorderPoint, setReorderPoint] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: uoms } = useFetch(
    () => fetchUoms(undefined, false),
    [],
    { enabled: open }
  );
  const defaultStockUomId = findDefaultStockUomId(uoms);

  // Apply default once when units arrive; skip if user already picked/cleared.
  useEffect(() => {
    if (!open || !defaultStockUomId) return;
    setStockUomId((current) => current ?? defaultStockUomId);
  }, [open, defaultStockUomId]);

  function openDialog() {
    if (disabled) return;
    resetQuickCreateFields({
      setDescription,
      setSku,
      setStockUomId,
      setItemType,
      setQuantity,
      setPurchasePrice,
      setReorderPoint,
      defaultStockUomId,
    });
    setOpen(true);
  }

  async function handleSubmit() {
    if (!locationId) {
      toast.error("Select a location first");
      return;
    }
    if (!description.trim()) {
      toast.error("Item description is required");
      return;
    }
    setSaving(true);
    try {
      const reorderValue = reorderPointBodyValue(reorderPoint);
      if (reorderValue === undefined) {
        toast.error("Enter a valid reorder point or leave blank");
        setSaving(false);
        return;
      }
      const body: Record<string, unknown> = {
        description: description.trim(),
        locationId,
        quantity: parseFloat(quantity) || 0,
        purchasePrice: parseFloat(purchasePrice) || 0,
        itemType,
        sku: sku || undefined,
        stockUomId: stockUomId || undefined,
      };
      if (reorderValue !== null) {
        body.reorderPoint = reorderValue;
      }
      const record = await api<StockRecord>("/inventory", {
        method: "POST",
        body,
      });
      toast.success("Item added to stock");
      setOpen(false);
      resetQuickCreateFields({
        setDescription,
        setSku,
        setStockUomId,
        setItemType,
        setQuantity,
        setPurchasePrice,
        setReorderPoint,
        defaultStockUomId,
      });
      onCreated(record);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const defaultTrigger = (
    <QuickCreateTrigger
      label="New item"
      onClick={openDialog}
      disabled={disabled}
      className={disabled ? "pointer-events-none opacity-50" : undefined}
    />
  );

  return (
    <>
      {bindQuickCreateTrigger(trigger, openDialog, defaultTrigger)}
      <QuickCreateDialogShell
        open={open}
        onOpenChange={onOpenChange}
        title="New stock item"
        footer={
          <>
            <FrappeButtonSecondary type="button" onClick={() => setOpen(false)}>
              Cancel
            </FrappeButtonSecondary>
            <FrappeButtonPrimary type="button" disabled={saving} onClick={handleSubmit}>
              Create
            </FrappeButtonPrimary>
          </>
        }
      >
        <div className="grid gap-4 p-4">
          <div className="grid gap-2">
            <Label htmlFor="item-desc">
              Description <span className="text-[var(--frappe-red)]">*</span>
            </Label>
            <Input
              id="item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-sku">SKU</Label>
              <Input
                id="item-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Unit</Label>
              <UomSelect
                value={stockUomId}
                onValueChange={setStockUomId}
                placeholder="Select unit"
                allowEmpty
                emptyLabel="Default (pcs)"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Item type</Label>
            <Select
              value={itemType}
              onValueChange={(v) => setItemType(v as ItemType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-qty">Opening qty</Label>
              <Input
                id="item-qty"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-price">Purchase price</Label>
              <Input
                id="item-price"
                type="number"
                min="0"
                step="any"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="item-reorder">Reorder point</Label>
            <Input
              id="item-reorder"
              type="number"
              min="0"
              step="any"
              placeholder="Optional"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
            />
          </div>
        </div>
      </QuickCreateDialogShell>
    </>
  );
}
