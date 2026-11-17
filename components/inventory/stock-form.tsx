"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FrappeButtonLink,
  FrappeButtonPrimary,
  FrappeDocument,
  FrappeField,
  FrappeFormGrid,
  FrappeFormToolbar,
  FrappeSection,
} from "@/components/frappe";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { fetchAttributes } from "@/lib/attributes";
import {
  ITEM_IMAGE_ACCEPT,
  uploadStockItemImage,
  validateItemImageFile,
} from "@/lib/inventory-media";
import {
  DEFAULT_ITEM_TYPE,
  DEFAULT_OPENING_QTY,
  DEFAULT_PURCHASE_PRICE,
  findDefaultLocationId,
  findDefaultStockUomId,
} from "@/lib/inventory-defaults";
import {
  optionalStringBodyValue,
  reorderPointBodyValue,
} from "@/lib/inventory-stock";
import { ITEM_TYPE_OPTIONS } from "@/lib/item-types";
import { errorMessage } from "@/lib/format";
import type {
  InventoryVariantCreateResult,
  ItemType,
  StockRecord,
} from "@/lib/types";
import { UomSelect } from "@/components/uom/uom-select";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import {
  countVariantCombinations,
  ItemAttributePicker,
  previewVariantCombinations,
  variantAttributesFromMulti,
  type MultiAttributeSelections,
} from "@/components/inventory/item-attribute-picker";
import { QuickLocationDialog } from "@/components/locations/quick-location-dialog";
import { useLocations } from "@/hooks/use-locations";
import { useFetch } from "@/hooks/use-fetch";
import { fetchUoms } from "@/lib/uom";
import { toast } from "sonner";
import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";

export function StockForm({
  defaultLocationId,
}: {
  /** Prefill from inventory list filter. */
  defaultLocationId?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    data: locations,
    loading: locationsLoading,
    setData: setLocations,
  } = useLocations();
  const { data: allUoms } = useFetch(() => fetchUoms(), []);
  const { data: attributes } = useFetch(() => fetchAttributes(), []);

  const [formLocationId, setFormLocationId] = useState(defaultLocationId ?? "");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [stockUomId, setStockUomId] = useState<string | null>(null);
  const [salesUomId, setSalesUomId] = useState<string | null>(null);
  const [purchaseUomId, setPurchaseUomId] = useState<string | null>(null);
  const [uomWidth, setUomWidth] = useState("");
  const [itemType, setItemType] = useState<ItemType>(DEFAULT_ITEM_TYPE);
  const [quantity, setQuantity] = useState(DEFAULT_OPENING_QTY);
  const [purchasePrice, setPurchasePrice] = useState(DEFAULT_PURCHASE_PRICE);
  const [reorderPoint, setReorderPoint] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [uomDefaultApplied, setUomDefaultApplied] = useState(false);
  const [multiAttributeSelections, setMultiAttributeSelections] =
    useState<MultiAttributeSelections>({});

  const stockUomCategoryId = useMemo(() => {
    if (!stockUomId) return null;
    return allUoms?.find((u) => u.id === stockUomId)?.categoryId ?? null;
  }, [stockUomId, allUoms]);

  const variantCount = useMemo(
    () => countVariantCombinations(multiAttributeSelections),
    [multiAttributeSelections]
  );

  const variantPreview = useMemo(
    () =>
      previewVariantCombinations(
        attributes,
        multiAttributeSelections,
        description,
        sku
      ),
    [attributes, multiAttributeSelections, description, sku]
  );

  useEffect(() => {
    if (!locations?.length) return;
    setFormLocationId((current) =>
      current && locations.some((l) => l.id === current)
        ? current
        : findDefaultLocationId(locations, defaultLocationId)
    );
  }, [locations, defaultLocationId]);

  useEffect(() => {
    if (uomDefaultApplied || !allUoms?.length) return;
    const id = findDefaultStockUomId(allUoms);
    if (id) {
      setStockUomId(id);
      setSalesUomId(id);
      setPurchaseUomId(id);
    }
    setUomDefaultApplied(true);
  }, [allUoms, uomDefaultApplied]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

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
  }

  function clearImage() {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setPreviewObjectUrl(null);
    setImageFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!formLocationId) {
      toast.error("Select a location");
      return;
    }
    const qty = parseFloat(quantity);
    if (Number.isNaN(qty) || qty < 0) {
      toast.error("Enter a valid opening quantity");
      return;
    }
    const price = parseFloat(purchasePrice);
    if (Number.isNaN(price) || price < 0) {
      toast.error("Enter a valid purchase price");
      return;
    }
    const reorderValue = reorderPointBodyValue(reorderPoint);
    if (reorderValue === undefined) {
      toast.error("Enter a valid reorder point or leave blank");
      return;
    }

    if (variantCount > 100) {
      toast.error("Too many variants (max 100). Narrow your attribute selections.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        description: description.trim(),
        locationId: formLocationId,
        quantity: qty,
        purchasePrice: price,
        itemType,
        sku: optionalStringBodyValue(sku) ?? undefined,
        stockUomId: stockUomId ?? undefined,
        salesUomId: salesUomId ?? undefined,
        purchaseUomId: purchaseUomId ?? undefined,
      };
      if (uomWidth.trim()) body.uomWidth = parseFloat(uomWidth);
      if (reorderValue !== null) body.reorderPoint = reorderValue;

      const variantAttributes = variantAttributesFromMulti(
        multiAttributeSelections
      );
      if (variantCount >= 2) {
        body.variantAttributes = variantAttributes;
      } else if (variantCount === 1) {
        body.attributeValueIds = variantAttributes.flatMap((a) => a.valueIds);
      } else {
        body.attributeValueIds = [];
      }

      const created = await api<StockRecord | InventoryVariantCreateResult>(
        "/inventory",
        { method: "POST", body }
      );

      const isVariantBatch =
        created &&
        typeof created === "object" &&
        "variants" in created &&
        Array.isArray(created.variants);

      if (isVariantBatch) {
        const batch = created as InventoryVariantCreateResult;
        if (imageFile) {
          for (const row of batch.variants) {
            await uploadStockItemImage(row.id, imageFile);
          }
        }
        toast.success(`Created ${batch.variants.length} variants`);
      } else {
        const row = created as StockRecord;
        if (row.id && imageFile) {
          await uploadStockItemImage(row.id, imageFile);
        }
        toast.success("Item created");
      }

      router.push("/inventory");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FrappeDocument>
        <FrappeFormToolbar>
          <FrappeButtonLink href="/inventory">Cancel</FrappeButtonLink>
          <FrappeButtonPrimary type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </FrappeButtonPrimary>
        </FrappeFormToolbar>

        <div className="border-b border-[var(--frappe-border)] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1 space-y-1">
              <label
                htmlFor="item-name"
                className="text-xs font-medium text-[var(--frappe-text-muted)]"
              >
                Item name <span className="text-[var(--frappe-red)]">*</span>
              </label>
              <Input
                id="item-name"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Cotton fabric blue"
                required
                autoFocus
                className="h-11 border-[var(--frappe-border)] bg-[var(--frappe-surface)] text-lg font-semibold shadow-none"
              />
              <p className="text-[11px] text-[var(--frappe-text-muted)]">
                Only the name is required — other fields have defaults.
              </p>
            </div>

            <div className="shrink-0">
              <input
                ref={fileRef}
                type="file"
                accept={ITEM_IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative flex size-28 flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-[var(--frappe-border)] bg-[var(--frappe-section-head)] transition-colors hover:border-[var(--frappe-primary)] hover:bg-[var(--frappe-surface)]"
                title="Upload image"
              >
                {previewObjectUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewObjectUrl}
                    alt=""
                    className="size-full object-contain p-1"
                  />
                ) : (
                  <>
                    <ImageIcon className="mb-1 size-7 text-[var(--frappe-text-muted)] opacity-60" />
                    <span className="text-[11px] text-[var(--frappe-text-muted)]">
                      Add image
                    </span>
                  </>
                )}
              </button>
              {previewObjectUrl ? (
                <div className="mt-1.5 flex justify-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => fileRef.current?.click()}
                  >
                    <UploadIcon className="size-3.5" />
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-7 px-2 text-xs"
                    onClick={clearImage}
                  >
                    <Trash2Icon className="size-3.5" />
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <Tabs defaultValue="general" className="gap-0">
          <div className="border-b border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4">
            <TabsList
              variant="line"
              className="h-10 w-full justify-start gap-0 rounded-none bg-transparent p-0"
            >
              <TabsTrigger
                value="general"
                className="rounded-none px-3 text-sm data-active:text-[var(--frappe-primary)]"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="sales"
                className="rounded-none px-3 text-sm data-active:text-[var(--frappe-primary)]"
              >
                Sales
              </TabsTrigger>
              <TabsTrigger
                value="purchase"
                className="rounded-none px-3 text-sm data-active:text-[var(--frappe-primary)]"
              >
                Purchase
              </TabsTrigger>
              <TabsTrigger
                value="attributes"
                className="rounded-none px-3 text-sm data-active:text-[var(--frappe-primary)]"
              >
                Attributes
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general" className="mt-0">
            <FrappeSection
              title="General information"
              description="Defaults are fine for a quick create — change only what you need."
            >
              <FrappeFormGrid columns={2}>
                <FrappeField label="SKU" hint="Optional product code">
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Optional"
                  />
                </FrappeField>
                <FrappeField label="Item type">
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
                </FrappeField>
                <EntitySelectField
                  label="Location"
                  required
                  hint="Defaults to the first warehouse"
                  value={formLocationId}
                  onValueChange={setFormLocationId}
                  options={(locations ?? []).map((l) => ({
                    id: l.id,
                    label: `${l.name} (${l.type})`,
                  }))}
                  placeholder={
                    locationsLoading
                      ? "Loading locations…"
                      : "Select location"
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
                />
                <FrappeField
                  label="Stock UOM"
                  hint="Inventory is stored in this unit (defaults to pcs)."
                >
                  <UomSelect
                    value={stockUomId}
                    onValueChange={(id) => {
                      setStockUomId(id);
                      setSalesUomId(id);
                      setPurchaseUomId(id);
                    }}
                    placeholder="pcs"
                    allowEmpty
                    emptyLabel="Default (pcs)"
                  />
                </FrappeField>
                <FrappeField
                  label="Opening quantity"
                  hint="Defaults to 0 — stock later via purchase or adjust."
                >
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </FrappeField>
                <FrappeField
                  label="Reorder point"
                  hint="Leave blank to disable low-stock alerts."
                >
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Optional"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(e.target.value)}
                  />
                </FrappeField>
                <FrappeField
                  label="Width (Length → Area)"
                  hint="Optional. Area = length × width when converting."
                >
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={uomWidth}
                    onChange={(e) => setUomWidth(e.target.value)}
                    placeholder="e.g. 1.5"
                  />
                </FrappeField>
              </FrappeFormGrid>
            </FrappeSection>
          </TabsContent>

          <TabsContent value="sales" className="mt-0">
            <FrappeSection
              title="Sales"
              description="How this item is sold. Selling price is set on each sales invoice."
            >
              <FrappeFormGrid columns={2}>
                <FrappeField
                  label="Sales UOM"
                  hint="Must stay in the same category as stock UOM."
                >
                  <UomSelect
                    value={salesUomId}
                    onValueChange={setSalesUomId}
                    categoryId={stockUomCategoryId}
                    requireCategory
                    allowEmpty
                    emptyLabel="Same as stock"
                    placeholder="Same as stock"
                  />
                </FrappeField>
              </FrappeFormGrid>
            </FrappeSection>
          </TabsContent>

          <TabsContent value="purchase" className="mt-0">
            <FrappeSection
              title="Purchase"
              description="How this item is bought and its default cost."
            >
              <FrappeFormGrid columns={2}>
                <FrappeField
                  label="Purchase UOM"
                  hint="Must stay in the same category as stock UOM."
                >
                  <UomSelect
                    value={purchaseUomId}
                    onValueChange={setPurchaseUomId}
                    categoryId={stockUomCategoryId}
                    requireCategory
                    allowEmpty
                    emptyLabel="Same as stock"
                    placeholder="Same as stock"
                  />
                </FrappeField>
                <FrappeField
                  label="Purchase price"
                  hint="Defaults to 0. Updated automatically on purchases."
                >
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </FrappeField>
              </FrappeFormGrid>
            </FrappeSection>
          </TabsContent>

          <TabsContent value="attributes" className="mt-0">
            <FrappeSection
              title="Attributes"
              description="Select multiple values to generate variants (each combination gets its own stock)."
              actions={
                <Link
                  href="/settings/attributes"
                  className="text-xs text-[var(--frappe-primary)] hover:underline"
                >
                  Manage attributes
                </Link>
              }
            >
              <ItemAttributePicker
                mode="multiple"
                attributes={attributes}
                multiSelections={multiAttributeSelections}
                onMultiChange={setMultiAttributeSelections}
              />

              {variantCount > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-[var(--frappe-text)]">
                    {variantCount >= 2 ? (
                      <>
                        Will create{" "}
                        <span className="font-semibold">{variantCount}</span>{" "}
                        stock variants
                        {variantPreview.length > 1
                          ? ` (${Object.values(multiAttributeSelections)
                              .filter((ids) => ids.length > 0)
                              .map((ids) => ids.length)
                              .join(" × ")})`
                          : null}
                        .
                      </>
                    ) : (
                      <>One combination — creates a single stock item.</>
                    )}
                  </p>
                  {variantCount >= 2 && variantCount <= 100 ? (
                    <div className="max-h-48 overflow-y-auto rounded border border-[var(--frappe-border)]">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-[var(--frappe-section-head)] text-[var(--frappe-text-muted)]">
                          <tr>
                            <th className="px-3 py-2 font-medium">Variant</th>
                            <th className="px-3 py-2 font-medium">SKU</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variantPreview.map((row) => (
                            <tr
                              key={row.label}
                              className="border-t border-[var(--frappe-border)]"
                            >
                              <td className="px-3 py-1.5 text-[var(--frappe-text)]">
                                {row.label}
                              </td>
                              <td className="px-3 py-1.5 tabular-nums text-[var(--frappe-text-muted)]">
                                {row.sku ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  {variantCount > 100 ? (
                    <p className="text-xs text-[var(--frappe-red)]">
                      Too many combinations (max 100). Clear some values.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-xs text-[var(--frappe-text-muted)]">
                  Optional. Leave empty for a simple item with no variants.
                </p>
              )}
            </FrappeSection>
          </TabsContent>
        </Tabs>
      </FrappeDocument>
    </form>
  );
}
