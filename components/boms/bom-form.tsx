"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QuickStockItemDialog } from "@/components/inventory/quick-stock-item-dialog";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
import { QuickCreateInlineTrigger } from "@/components/shared/quick-create-trigger";
import { SearchSelect } from "@/components/shared/search-select";
import { LineUomSelect } from "@/components/uom/line-uom-select";
import {
  FrappeButtonLink,
  FrappeButtonPrimary,
  FrappeDocument,
  FrappeField,
  FrappeFormGrid,
  FrappeFormToolbar,
  FrappeGridCell,
  FrappeGridRow,
  FrappeGridTable,
  FrappeSection,
} from "@/components/frappe";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { fetchBomCatalog, itemOptionLabel } from "@/lib/bom-catalog";
import { findDefaultLocationId } from "@/lib/inventory-defaults";
import { formatItemAttributeLabel } from "@/lib/item-attributes";
import {
  preferRicherItem,
  productItemId,
  resolveItem,
} from "@/lib/inventory-items";
import {
  defaultUomIdForItem,
  fetchUoms,
  findDefaultLengthUomId,
  itemAllowsCuts,
  lengthUoms,
} from "@/lib/uom";
import { errorMessage } from "@/lib/format";
import type { Bom, BomType, Item, StockRecord } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { useLocations } from "@/hooks/use-locations";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface BomLineRow {
  componentItemId: string;
  quantity: string;
  scrapPercent: string;
  uomId: string;
  width: string;
  height: string;
  pieces: string;
  dimUomId: string;
}

function emptyBomLine(defaultDimUomId = ""): BomLineRow {
  return {
    componentItemId: "",
    quantity: "1",
    scrapPercent: "",
    uomId: "",
    width: "",
    height: "",
    pieces: "1",
    dimUomId: defaultDimUomId,
  };
}

function linesFromBom(bom: Bom, defaultDimUomId = ""): BomLineRow[] {
  const rows = (bom.lines ?? []).map((line) => ({
    componentItemId: line.componentItemId,
    quantity: String(line.quantity ?? ""),
    scrapPercent:
      line.scrapPercent != null && line.scrapPercent !== ""
        ? String(line.scrapPercent)
        : "",
    uomId:
      line.uomId ??
      defaultUomIdForItem(line.componentItem, "stock") ??
      "",
    width: line.dimWidth != null && line.dimWidth !== "" ? String(line.dimWidth) : "",
    height:
      line.dimHeight != null && line.dimHeight !== ""
        ? String(line.dimHeight)
        : "",
    pieces:
      line.dimPieces != null && line.dimPieces !== ""
        ? String(line.dimPieces)
        : "1",
    dimUomId: line.dimUomId ?? defaultDimUomId,
  }));
  return rows.length > 0 ? rows : [emptyBomLine(defaultDimUomId)];
}

export function BomForm({ bom }: { bom?: Bom }) {
  const router = useRouter();
  const isEdit = !!bom?.id;
  const [finishedItemId, setFinishedItemId] = useState(
    bom?.finishedItemId ?? ""
  );
  const [variantItemId, setVariantItemId] = useState(
    bom?.variantItemId ?? ""
  );
  const [reference, setReference] = useState(bom?.name ?? "");
  const [quantity, setQuantity] = useState(
    String(bom?.quantity ?? "1")
  );
  const [bomType, setBomType] = useState<BomType>(
    bom?.bomType ?? "MANUFACTURE"
  );
  const [notes, setNotes] = useState(bom?.notes ?? "");
  const [isActive, setIsActive] = useState(bom?.isActive !== false);
  const [lines, setLines] = useState<BomLineRow[]>(() =>
    bom ? linesFromBom(bom) : [emptyBomLine()]
  );
  const [saving, setSaving] = useState(false);

  const {
    data: catalog,
    loading,
    reload: reloadCatalog,
    setData: setCatalog,
  } = useFetch(() => fetchBomCatalog(), []);
  const { data: locations } = useLocations();
  const { data: uomsData, loading: uomsLoading } = useFetch(
    () => fetchUoms(undefined, false),
    []
  );
  const uoms = uomsData ?? [];
  const dimLengthUoms = useMemo(() => lengthUoms(uoms), [uoms]);
  const defaultDimUomId = useMemo(
    () => findDefaultLengthUomId(uoms) ?? "",
    [uoms]
  );
  const quickLocationId = findDefaultLocationId(locations);

  // Prefill dim UOM (meters) once UOMs load for new lines / edit without dimUomId.
  useEffect(() => {
    if (!defaultDimUomId) return;
    setLines((prev) =>
      prev.map((line) =>
        line.dimUomId ? line : { ...line, dimUomId: defaultDimUomId }
      )
    );
  }, [defaultDimUomId]);

  const products = catalog?.products ?? [];
  const components = catalog?.components ?? [];

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === finishedItemId) ?? null,
    [products, finishedItemId]
  );

  const productVariants = useMemo(() => {
    if (!selectedProduct) return [];
    if (selectedProduct.variants?.length) return selectedProduct.variants;
    return (catalog?.variants ?? []).filter(
      (v) => v.parentItemId === finishedItemId
    );
  }, [selectedProduct, catalog?.variants, finishedItemId]);

  const itemById = useMemo(() => {
    const map = new Map<string, Item>();
    const add = (item?: Item | null) => {
      if (!item?.id) return;
      map.set(item.id, preferRicherItem(map.get(item.id), resolveItem(item.id, item)));
    };
    if (bom?.finishedItem) add(resolveItem(bom.finishedItemId, bom.finishedItem));
    if (bom?.variantItem) add(resolveItem(bom.variantItemId!, bom.variantItem));
    for (const line of bom?.lines ?? []) {
      if (line.componentItem) add(resolveItem(line.componentItemId, line.componentItem));
    }
    for (const item of products) {
      add(item);
      for (const v of item.variants ?? []) add(v);
    }
    for (const item of components) add(item);
    return map;
  }, [bom, products, components]);

  const productOptions = products.map((item) => ({
    itemId: item.id,
    label: itemOptionLabel(item) + (item.isTemplate ? " (template)" : ""),
  }));

  const variantOptions = productVariants.map((item) => ({
    itemId: item.id,
    label:
      formatItemAttributeLabel(item.attributeValues) ||
      itemOptionLabel(item),
  }));

  const componentOptions = (() => {
    const options = components.map((item) => ({
      itemId: item.id,
      label: itemOptionLabel(item),
    }));
    const pushIfMissing = (itemId: string, label: string) => {
      if (!itemId || options.some((o) => o.itemId === itemId)) return;
      options.push({ itemId, label });
    };
    for (const line of bom?.lines ?? []) {
      if (!line.componentItem) continue;
      pushIfMissing(line.componentItemId, itemOptionLabel(line.componentItem));
    }
    return options;
  })();

  function updateLine(index: number, patch: Partial<BomLineRow>) {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function onProductChange(productId: string, productHint?: Item | null) {
    setFinishedItemId(productId);
    setVariantItemId("");
    const product =
      productHint ?? products.find((p) => p.id === productId) ?? null;
    if (!reference.trim() && product) {
      setReference(product.description);
    }
  }

  function mergeCreatedItem(item: Item) {
    setCatalog((prev) => {
      if (!prev) {
        return {
          products: [item],
          components: item.isTemplate ? [] : [item],
          variants: [],
        };
      }
      const nextProducts = prev.products.some((p) => p.id === item.id)
        ? prev.products
        : [...prev.products, item];
      const nextComponents =
        item.isTemplate || prev.components.some((c) => c.id === item.id)
          ? prev.components
          : [...prev.components, item];
      return {
        ...prev,
        products: nextProducts,
        components: nextComponents,
      };
    });
    void reloadCatalog();
  }

  function onProductCreated(record: StockRecord) {
    const item = resolveItem(productItemId(record), record.item);
    mergeCreatedItem(item);
    onProductChange(item.id, item);
  }

  function onComponentCreated(record: StockRecord, lineIndex?: number) {
    const item = resolveItem(productItemId(record), record.item);
    mergeCreatedItem(item);
    const emptyIdx = lines.findIndex((l) => !l.componentItemId);
    const idx =
      lineIndex != null
        ? lineIndex
        : emptyIdx >= 0
          ? emptyIdx
          : lines.length - 1;
    if (idx < 0) {
      setLines((prev) => [
        ...prev,
        {
          ...emptyBomLine(defaultDimUomId),
          componentItemId: item.id,
          uomId: defaultUomIdForItem(item, "stock") ?? "",
        },
      ]);
      return;
    }
    updateLine(idx, {
      componentItemId: item.id,
      uomId: defaultUomIdForItem(item, "stock") ?? "",
      dimUomId: lines[idx]?.dimUomId || defaultDimUomId,
    });
  }

  function itemQuickCreateFooter(
    onCreated: (record: StockRecord) => void,
    close: () => void
  ) {
    return (
      <QuickStockItemDialog
        locationId={quickLocationId}
        disabled={!quickLocationId}
        onCreated={onCreated}
        trigger={
          <QuickCreateInlineTrigger
            label="Create new item"
            className="flex w-full items-center gap-1 px-2 py-1.5 text-left text-sm"
            disabled={!quickLocationId}
            onClick={close}
          />
        }
      />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!finishedItemId) {
      toast.error("Select a product");
      return;
    }
    const qty = parseFloat(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    const effectiveFinished = variantItemId || finishedItemId;
    const parsedLines: {
      componentItemId: string;
      quantity?: number;
      scrapPercent?: number;
      uomId?: string;
      width?: number;
      height?: number;
      pieces?: number;
      dimUomId?: string;
    }[] = [];
    for (const line of lines) {
      if (!line.componentItemId) continue;
      if (line.componentItemId === effectiveFinished) {
        toast.error("Finished product cannot be a component of itself");
        return;
      }
      const widthRaw = (line.width ?? "").trim();
      const heightRaw = (line.height ?? "").trim();
      const isCut = Boolean(widthRaw || heightRaw);
      let width: number | undefined;
      let height: number | undefined;
      let pieces: number | undefined;
      if (isCut) {
        width = parseFloat(widthRaw);
        height = parseFloat(heightRaw);
        if (
          !widthRaw ||
          !heightRaw ||
          Number.isNaN(width) ||
          Number.isNaN(height) ||
          width <= 0 ||
          height <= 0
        ) {
          toast.error("Cut lines need positive width and height");
          return;
        }
        pieces = parseFloat(line.pieces || "1");
        if (Number.isNaN(pieces) || pieces < 1) {
          toast.error("Pieces must be at least 1");
          return;
        }
      } else {
        const lineQty = parseFloat(line.quantity);
        if (Number.isNaN(lineQty) || lineQty <= 0) {
          toast.error("Each component needs a positive quantity");
          return;
        }
      }
      const entry: {
        componentItemId: string;
        quantity?: number;
        scrapPercent?: number;
        uomId?: string;
        width?: number;
        height?: number;
        pieces?: number;
        dimUomId?: string;
      } = {
        componentItemId: line.componentItemId,
      };
      if (isCut) {
        entry.width = width;
        entry.height = height;
        entry.pieces = pieces;
        entry.quantity = pieces;
        if (line.dimUomId) entry.dimUomId = line.dimUomId;
      } else {
        entry.quantity = parseFloat(line.quantity);
      }
      if (line.uomId) entry.uomId = line.uomId;
      if (line.scrapPercent.trim()) {
        const scrap = parseFloat(line.scrapPercent);
        if (Number.isNaN(scrap) || scrap < 0) {
          toast.error("Scrap % must be a valid number");
          return;
        }
        entry.scrapPercent = scrap;
      }
      parsedLines.push(entry);
    }
    if (parsedLines.length === 0) {
      toast.error("Add at least one component");
      return;
    }

    setSaving(true);
    try {
      const body = {
        finishedItemId,
        variantItemId: variantItemId || null,
        name: reference.trim() || undefined,
        quantity: qty,
        bomType,
        notes: notes.trim() || undefined,
        isActive,
        lines: parsedLines,
      };
      if (isEdit && bom) {
        await api(`/boms/${bom.id}`, { method: "PATCH", body });
        toast.success("BoM updated");
        router.push(`/boms/${bom.id}`);
      } else {
        const created = await api<Bom>("/boms", { method: "POST", body });
        toast.success("BoM created");
        router.push(`/boms/${created.id}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !catalog) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const stockUnit =
    selectedProduct?.stockUom?.symbol ||
    selectedProduct?.unit ||
    "Units";

  return (
    <form onSubmit={handleSubmit}>
      <FrappeDocument>
        <FrappeFormToolbar>
          <FrappeButtonLink href="/boms">Cancel</FrappeButtonLink>
          <FrappeButtonPrimary type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update" : "Save"}
          </FrappeButtonPrimary>
        </FrappeFormToolbar>

        <FrappeSection title="Bill of Materials">
          <FrappeFormGrid columns={2}>
            <FrappeField label="Product" required>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <ItemSearchSelect
                  value={finishedItemId}
                  onValueChange={onProductChange}
                  options={productOptions}
                  placeholder="Select product…"
                  searchPlaceholder="Search product…"
                  className="sm:flex-1"
                  footer={(close) =>
                    itemQuickCreateFooter(onProductCreated, close)
                  }
                />
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <QuickStockItemDialog
                    locationId={quickLocationId}
                    disabled={!quickLocationId}
                    onCreated={onProductCreated}
                  />
                  <Link
                    href="/inventory"
                    className="text-xs text-[var(--frappe-text-muted)] hover:text-[var(--frappe-primary)] hover:underline"
                  >
                    All items
                  </Link>
                </div>
              </div>
            </FrappeField>
            <FrappeField
              label="Reference"
              hint="Optional internal BoM label. Defaults to the product name."
            >
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Standard / Premium"
              />
            </FrappeField>
            <FrappeField
              label="Product Variant"
              hint="Leave empty to apply this BoM to the product (all variants)."
            >
              <ItemSearchSelect
                value={variantItemId}
                onValueChange={setVariantItemId}
                options={variantOptions}
                placeholder={
                  !finishedItemId
                    ? "Select a product first…"
                    : productVariants.length === 0
                      ? "No variants"
                      : "Optional — all variants"
                }
                searchPlaceholder="Search variant…"
                disabled={!finishedItemId || productVariants.length === 0}
              />
            </FrappeField>
            <FrappeField label="BoM Type">
              <div className="flex flex-col gap-2 pt-1">
                {(
                  [
                    {
                      value: "MANUFACTURE" as const,
                      label: "Manufacture this product",
                      hint: "Used for production orders",
                    },
                    {
                      value: "KIT" as const,
                      label: "Kit",
                      hint: "Sell as a bundle — not produced",
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-2 text-sm text-[var(--frappe-text)]"
                  >
                    <input
                      type="radio"
                      name="bomType"
                      value={opt.value}
                      checked={bomType === opt.value}
                      onChange={() => setBomType(opt.value)}
                      className="mt-0.5 size-3.5 accent-[var(--frappe-primary)]"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span>{opt.label}</span>
                      <span className="text-xs text-[var(--frappe-text-muted)]">
                        {opt.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </FrappeField>
            <FrappeField
              label="Quantity"
              hint={`Component quantities are for this finished quantity (${stockUnit}).`}
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="any"
                  min="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="max-w-[8rem]"
                />
                <span className="text-sm text-[var(--frappe-text-muted)]">
                  {stockUnit}
                </span>
              </div>
            </FrappeField>
            <FrappeField
              label="Active"
              hint="Inactive BoMs are hidden from production."
            >
              <div className="flex h-9 items-center gap-2.5">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span
                  className={cn(
                    "text-sm font-medium",
                    isActive
                      ? "text-[var(--frappe-text)]"
                      : "text-[var(--frappe-text-muted)]"
                  )}
                >
                  {isActive ? "Yes" : "No"}
                </span>
              </div>
            </FrappeField>
            <FrappeField label="Notes" fullWidth>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </FrappeField>
          </FrappeFormGrid>
        </FrappeSection>

        <FrappeSection
          title="Components"
          description={`Quantities needed to produce ${quantity || "1"} finished ${stockUnit}. Cut W×H use the Dim unit (m/cm/mm) and convert to area. Scrap % increases required material. Nested Manufacture BoMs explode on production.`}
        >
          <div className="mb-3 flex flex-wrap items-center justify-end gap-3">
            <QuickStockItemDialog
              locationId={quickLocationId}
              disabled={!quickLocationId}
              onCreated={(record) => onComponentCreated(record)}
            />
            <Link
              href="/inventory"
              className="text-xs text-[var(--frappe-text-muted)] hover:text-[var(--frappe-primary)] hover:underline"
            >
              All items
            </Link>
          </div>
          <FrappeGridTable
            columns={[
              { key: "component", label: "Component" },
              { key: "uom", label: "Unit", className: "w-24" },
              { key: "dimUom", label: "Dim", className: "w-20" },
              { key: "w", label: "W", className: "w-20" },
              { key: "h", label: "H", className: "w-20" },
              { key: "pcs", label: "Pcs", className: "w-16" },
              { key: "qty", label: "Quantity", className: "w-24" },
              { key: "scrap", label: "Scrap %", className: "w-20" },
            ]}
            onAddRow={() =>
              setLines((prev) => [...prev, emptyBomLine(defaultDimUomId)])
            }
            addLabel="Add a line"
          >
            {lines.map((line, index) => {
              const item = itemById.get(line.componentItemId);
              const cut = itemAllowsCuts(item, uoms);
              const isCutFilled = Boolean(
                (line.width ?? "").trim() && (line.height ?? "").trim()
              );
              return (
                <FrappeGridRow
                  key={index}
                  canRemove
                  onRemove={() =>
                    setLines((prev) =>
                      prev.length <= 1
                        ? [emptyBomLine(defaultDimUomId)]
                        : prev.filter((_, i) => i !== index)
                    )
                  }
                >
                  <FrappeGridCell>
                    <ItemSearchSelect
                      value={line.componentItemId}
                      onValueChange={(componentItemId) => {
                        const next = itemById.get(componentItemId);
                        updateLine(index, {
                          componentItemId,
                          uomId: defaultUomIdForItem(next, "stock") ?? "",
                          width: "",
                          height: "",
                          pieces: "1",
                          dimUomId: line.dimUomId || defaultDimUomId,
                        });
                      }}
                      options={componentOptions}
                      placeholder="Select component…"
                      searchPlaceholder="Search component…"
                      footer={(close) =>
                        itemQuickCreateFooter(
                          (record) => onComponentCreated(record, index),
                          close
                        )
                      }
                    />
                  </FrappeGridCell>
                  <FrappeGridCell>
                    <LineUomSelect
                      value={line.uomId || null}
                      onValueChange={(uomId) =>
                        updateLine(index, { uomId: uomId ?? "" })
                      }
                      item={item}
                      uoms={uoms}
                      loading={uomsLoading}
                      disabled={cut && isCutFilled}
                    />
                  </FrappeGridCell>
                  <FrappeGridCell>
                    {cut ? (
                      <SearchSelect
                        value={line.dimUomId || defaultDimUomId || ""}
                        onValueChange={(v) =>
                          updateLine(index, {
                            dimUomId: v || defaultDimUomId,
                          })
                        }
                        options={dimLengthUoms.map((u) => ({
                          value: u.id,
                          label: u.symbol || u.code,
                        }))}
                        placeholder="m"
                        searchPlaceholder="Length unit…"
                        emptyMessage="Add Length UOMs first."
                        loading={uomsLoading}
                        className="h-8"
                      />
                    ) : (
                      <span className="text-xs text-[var(--frappe-text-muted)]">
                        —
                      </span>
                    )}
                  </FrappeGridCell>
                  <FrappeGridCell>
                    {cut ? (
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={line.width ?? ""}
                        onChange={(e) =>
                          updateLine(index, { width: e.target.value })
                        }
                        placeholder={`W (${
                          dimLengthUoms.find(
                            (u) => u.id === (line.dimUomId || defaultDimUomId)
                          )?.symbol ?? "m"
                        })`}
                        title="Width in the Dim unit"
                        className="h-8"
                      />
                    ) : (
                      <span className="text-xs text-[var(--frappe-text-muted)]">
                        —
                      </span>
                    )}
                  </FrappeGridCell>
                  <FrappeGridCell>
                    {cut ? (
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={line.height ?? ""}
                        onChange={(e) =>
                          updateLine(index, { height: e.target.value })
                        }
                        placeholder={`H (${
                          dimLengthUoms.find(
                            (u) => u.id === (line.dimUomId || defaultDimUomId)
                          )?.symbol ?? "m"
                        })`}
                        title="Height in the Dim unit"
                        className="h-8"
                      />
                    ) : (
                      <span className="text-xs text-[var(--frappe-text-muted)]">
                        —
                      </span>
                    )}
                  </FrappeGridCell>
                  <FrappeGridCell>
                    {cut ? (
                      <Input
                        type="number"
                        step="any"
                        min="1"
                        value={line.pieces ?? "1"}
                        onChange={(e) =>
                          updateLine(index, { pieces: e.target.value })
                        }
                        className="h-8"
                      />
                    ) : (
                      <span className="text-xs text-[var(--frappe-text-muted)]">
                        —
                      </span>
                    )}
                  </FrappeGridCell>
                  <FrappeGridCell>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(index, { quantity: e.target.value })
                      }
                      disabled={cut && isCutFilled}
                      className="h-8"
                      title={
                        cut && isCutFilled
                          ? "Qty from W×H×pieces"
                          : undefined
                      }
                    />
                  </FrappeGridCell>
                  <FrappeGridCell>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={line.scrapPercent}
                      onChange={(e) =>
                        updateLine(index, { scrapPercent: e.target.value })
                      }
                      placeholder="0"
                      className="h-8"
                    />
                  </FrappeGridCell>
                </FrappeGridRow>
              );
            })}
          </FrappeGridTable>
        </FrappeSection>
      </FrappeDocument>
    </form>
  );
}
