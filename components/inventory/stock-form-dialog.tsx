"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { fetchAttributes } from "@/lib/attributes";
import {
  clearStockItemImage,
  ITEM_IMAGE_ACCEPT,
  resolveItemImageUrl,
  uploadStockItemImage,
  validateItemImageFile,
} from "@/lib/inventory-media";
import {
  optionalStringBodyValue,
  reorderPointBodyValue,
} from "@/lib/inventory-stock";
import {
  DEFAULT_ITEM_TYPE,
  DEFAULT_OPENING_QTY,
  DEFAULT_PURCHASE_PRICE,
  findDefaultLocationId,
  findDefaultStockUomId,
} from "@/lib/inventory-defaults";
import { ITEM_TYPE_OPTIONS } from "@/lib/item-types";
import { formatQty, errorMessage } from "@/lib/format";
import { formatItemStockQty } from "@/lib/uom";
import { requestNotificationsRefresh } from "@/lib/notification-events";
import type { ItemType, StockRecord } from "@/lib/types";
import { UomSelect } from "@/components/uom/uom-select";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import {
  attributeValueIdsFromSelections,
  ItemAttributePicker,
  selectionsFromAttributeValues,
  type AttributeSelections,
} from "@/components/inventory/item-attribute-picker";
import { ItemImage } from "@/components/shared/item-image";
import { QuickLocationDialog } from "@/components/locations/quick-location-dialog";
import { useLocations } from "@/hooks/use-locations";
import { useFetch } from "@/hooks/use-fetch";
import { fetchUoms } from "@/lib/uom";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";

export function StockFormDialog({
  locationId: defaultLocationId,
  record,
  onSuccess,
  trigger,
  disabled,
}: {
  /** Prefill for create (e.g. current list filter). Location is chosen inside the form. */
  locationId?: string;
  record?: StockRecord;
  onSuccess: () => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const {
    data: locations,
    loading: locationsLoading,
    setData: setLocations,
  } = useLocations();
  const [formLocationId, setFormLocationId] = useState(
    record?.locationId ?? defaultLocationId ?? ""
  );
  const [description, setDescription] = useState(
    record?.item.description ?? ""
  );
  const [sku, setSku] = useState(record?.item.sku ?? "");
  const [stockUomId, setStockUomId] = useState<string | null>(
    record?.item.stockUomId ?? null
  );
  const [salesUomId, setSalesUomId] = useState<string | null>(
    record?.item.salesUomId ?? null
  );
  const [purchaseUomId, setPurchaseUomId] = useState<string | null>(
    record?.item.purchaseUomId ?? null
  );
  const [uomWidth, setUomWidth] = useState(record?.item.uomWidth ?? "");
  const [itemType, setItemType] = useState<ItemType | "">(
    record?.item.itemType ?? (record ? "" : DEFAULT_ITEM_TYPE)
  );
  const [quantity, setQuantity] = useState(
    record?.quantity ?? DEFAULT_OPENING_QTY
  );
  const [purchasePrice, setPurchasePrice] = useState(
    record?.purchasePrice ?? DEFAULT_PURCHASE_PRICE
  );
  const [reorderPoint, setReorderPoint] = useState(record?.reorderPoint ?? "");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    resolveItemImageUrl(record?.item.imageUrl)
  );
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [attributeSelections, setAttributeSelections] =
    useState<AttributeSelections>(() =>
      selectionsFromAttributeValues(record?.item.attributeValues)
    );

  const { data: allUoms } = useFetch(() => fetchUoms(), []);
  const { data: attributes } = useFetch(() => fetchAttributes(), []);
  const stockUomCategoryId = useMemo(() => {
    if (!stockUomId) return null;
    return (
      allUoms?.find((u) => u.id === stockUomId)?.categoryId ??
      record?.item.stockUom?.categoryId ??
      null
    );
  }, [stockUomId, allUoms, record?.item.stockUom?.categoryId]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  function resetImageState(nextRecord?: StockRecord) {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setPreviewObjectUrl(null);
    setImageFile(null);
    setRemoveExistingImage(false);
    setExistingImageUrl(resolveItemImageUrl(nextRecord?.item.imageUrl));
    if (fileRef.current) fileRef.current.value = "";
  }

  function applyCreateDefaults() {
    const defaultUomId = findDefaultStockUomId(allUoms);
    setFormLocationId(findDefaultLocationId(locations, defaultLocationId));
    setDescription("");
    setSku("");
    setStockUomId(defaultUomId);
    setSalesUomId(defaultUomId);
    setPurchaseUomId(defaultUomId);
    setUomWidth("");
    setItemType(DEFAULT_ITEM_TYPE);
    setQuantity(DEFAULT_OPENING_QTY);
    setPurchasePrice(DEFAULT_PURCHASE_PRICE);
    setReorderPoint("");
    setAttributeSelections({});
    resetImageState();
  }

  useEffect(() => {
    if (open && !record && !formLocationId && locations?.length) {
      setFormLocationId(findDefaultLocationId(locations, defaultLocationId));
    }
  }, [open, record, formLocationId, locations, defaultLocationId]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      if (record) {
        setFormLocationId(record.locationId);
        setDescription(record.item.description ?? "");
        setSku(record.item.sku ?? "");
        setStockUomId(record.item.stockUomId ?? null);
        setSalesUomId(record.item.salesUomId ?? null);
        setPurchaseUomId(record.item.purchaseUomId ?? null);
        setUomWidth(record.item.uomWidth ?? "");
        setItemType(record.item.itemType ?? "");
        setQuantity(record.quantity ?? "");
        setPurchasePrice(record.purchasePrice ?? "");
        setReorderPoint(record.reorderPoint ?? "");
        setAttributeSelections(
          selectionsFromAttributeValues(record.item.attributeValues)
        );
        resetImageState(record);
      } else {
        applyCreateDefaults();
      }
    }
  }

  function onPickImage(file: File | undefined) {
    if (!file) return;
    const err = validateItemImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setImageFile(file);
    setPreviewObjectUrl(URL.createObjectURL(file));
    setRemoveExistingImage(false);
  }

  const displayImageSrc =
    previewObjectUrl || (!removeExistingImage ? existingImageUrl : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetLocationId = record?.locationId ?? formLocationId;
    if (!record && !targetLocationId) {
      toast.error("Select a location");
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
      if (!description.trim()) {
        toast.error("Description is required");
        setSaving(false);
        return;
      }

      let stockId = record?.id;
      if (record) {
        await api(`/inventory/${record.id}`, {
          method: "PATCH",
          body: {
            description: description.trim(),
            sku: optionalStringBodyValue(sku),
            stockUomId,
            salesUomId,
            purchaseUomId,
            uomWidth: uomWidth.trim()
              ? parseFloat(uomWidth)
              : null,
            itemType: itemType || null,
            purchasePrice: parseFloat(purchasePrice),
            reorderPoint: reorderValue,
            attributeValueIds:
              attributeValueIdsFromSelections(attributeSelections),
          },
        });
        requestNotificationsRefresh();
      } else {
        const qty = parseFloat(quantity);
        if (quantity.trim() === "" || Number.isNaN(qty) || qty < 0) {
          toast.error("Enter a valid opening quantity");
          setSaving(false);
          return;
        }
        const price = parseFloat(purchasePrice);
        if (purchasePrice.trim() === "" || Number.isNaN(price) || price < 0) {
          toast.error("Enter a valid purchase price");
          setSaving(false);
          return;
        }
        const body: Record<string, unknown> = {
          description: description.trim(),
          locationId: targetLocationId,
          quantity: qty,
          purchasePrice: price,
          itemType: itemType || DEFAULT_ITEM_TYPE,
          sku: optionalStringBodyValue(sku) ?? undefined,
          stockUomId: stockUomId ?? undefined,
          salesUomId: salesUomId ?? undefined,
          purchaseUomId: purchaseUomId ?? undefined,
          attributeValueIds:
            attributeValueIdsFromSelections(attributeSelections),
        };
        if (uomWidth.trim()) body.uomWidth = parseFloat(uomWidth);
        if (reorderValue !== null) {
          body.reorderPoint = reorderValue;
        }
        const created = await api<StockRecord>("/inventory", {
          method: "POST",
          body,
        });
        stockId = created.id;
      }

      if (stockId && imageFile) {
        await uploadStockItemImage(stockId, imageFile);
      } else if (stockId && record && removeExistingImage && existingImageUrl) {
        await clearStockItemImage(stockId);
      }

      toast.success(record ? "Stock updated" : "Stock added");
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" disabled={disabled}>
            <PlusIcon />
            Add item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="shrink-0 border-b border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-3">
            <DialogTitle className="text-base">
              {record ? "Edit stock" : "Add stock"}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4">
            {!record ? (
              <EntitySelectField
                label="Location"
                required
                value={formLocationId}
                onValueChange={setFormLocationId}
                options={(locations ?? []).map((l) => ({
                  id: l.id,
                  label: `${l.name} (${l.type})`,
                }))}
                placeholder={
                  locationsLoading ? "Loading locations…" : "Select location"
                }
                listHref="/locations"
                listLabel="All locations"
                emptyMessage="Add a location to stock items."
                quickCreate={
                  <QuickLocationDialog
                    onCreated={(location) => {
                      setLocations((prev) => [...(prev ?? []), location]);
                      setFormLocationId(location.id);
                    }}
                  />
                }
                disabled={locationsLoading}
                stackedActions
              />
            ) : (
              <div className="grid gap-1">
                <Label>Location</Label>
                <p className="text-sm text-[var(--frappe-text)]">
                  {record.location?.name ?? "—"}
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Item image (optional)</Label>
              <div className="flex items-start gap-3">
                <ItemImage src={displayImageSrc} size="md" alt="" />
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ITEM_IMAGE_ACCEPT}
                    className="hidden"
                    onChange={(e) => onPickImage(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <UploadIcon className="size-4" />
                    {displayImageSrc ? "Change image" : "Upload image"}
                  </Button>
                  {displayImageSrc ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        if (previewObjectUrl) {
                          URL.revokeObjectURL(previewObjectUrl);
                          setPreviewObjectUrl(null);
                          setImageFile(null);
                          if (fileRef.current) fileRef.current.value = "";
                        } else {
                          setRemoveExistingImage(true);
                        }
                      }}
                    >
                      <Trash2Icon className="size-4" />
                      Remove
                    </Button>
                  ) : null}
                  <p className="text-muted-foreground text-xs">
                    JPEG, PNG, WebP, or GIF · max 5 MB
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>SKU (optional)</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Stock UOM</Label>
              <UomSelect
                value={stockUomId}
                onValueChange={(id) => {
                  setStockUomId(id);
                  // Changing category clears sales/purchase so they cannot mix.
                  setSalesUomId(null);
                  setPurchaseUomId(null);
                }}
                placeholder="Default pcs"
                allowEmpty
                emptyLabel="Default (pcs)"
              />
              <p className="text-xs text-muted-foreground">
                Inventory is always stored in this unit. Sales/purchase units
                stay in the same category.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Sales UOM</Label>
                <UomSelect
                  value={salesUomId}
                  onValueChange={setSalesUomId}
                  categoryId={stockUomCategoryId}
                  requireCategory
                  allowEmpty
                  emptyLabel="Same as stock"
                  placeholder="Same category as stock"
                />
              </div>
              <div className="grid gap-2">
                <Label>Purchase UOM</Label>
                <UomSelect
                  value={purchaseUomId}
                  onValueChange={setPurchaseUomId}
                  categoryId={stockUomCategoryId}
                  requireCategory
                  allowEmpty
                  emptyLabel="Same as stock"
                  placeholder="Same category as stock"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Width (Length → Area)</Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={uomWidth}
                onChange={(e) => setUomWidth(e.target.value)}
                placeholder="e.g. 1.5 for fabric"
              />
              <p className="text-xs text-muted-foreground">
                When stock is Area (sqm) and you sell/buy by Length (m): area =
                length × width.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Item type</Label>
              <Select
                value={itemType || DEFAULT_ITEM_TYPE}
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
            {record ? (
              <p className="text-xs text-muted-foreground">
                Description, SKU, UOMs, item type, and image update this item
                everywhere it is stocked. Quantity cannot be edited here — use
                Adjust on the stock row.
              </p>
            ) : null}
            {!record ? (
              <div className="grid gap-2">
                <Label>Opening quantity</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to 0 — you can stock later via purchase or adjust.
                </p>
              </div>
            ) : (
              <div className="rounded border border-dashed border-[var(--frappe-border)] px-3 py-2 text-sm text-[var(--frappe-text-muted)]">
                On hand:{" "}
                <span className="font-medium tabular-nums text-[var(--frappe-text)]">
                  {formatItemStockQty(record.quantity, record.item, formatQty)}
                </span>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Purchase price</Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
              {!record ? (
                <p className="text-xs text-muted-foreground">
                  Defaults to 0.
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>Reorder point (optional)</Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="Alert when quantity at or below"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to disable low-stock alerts for this item.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Attributes</Label>
              <ItemAttributePicker
                attributes={attributes}
                selections={attributeSelections}
                onChange={setAttributeSelections}
                compact
              />
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : record ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
