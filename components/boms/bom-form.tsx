"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
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
import { formatItemAttributeLabel } from "@/lib/item-attributes";
import { preferRicherItem, resolveItem } from "@/lib/inventory-items";
import { defaultUomIdForItem, fetchUoms } from "@/lib/uom";
import { errorMessage } from "@/lib/format";
import type { Bom, BomType, Item } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface BomLineRow {
  componentItemId: string;
  quantity: string;
  scrapPercent: string;
  uomId: string;
}

function emptyBomLine(): BomLineRow {
  return { componentItemId: "", quantity: "1", scrapPercent: "", uomId: "" };
}

function linesFromBom(bom: Bom): BomLineRow[] {
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
  }));
  return rows.length > 0 ? rows : [emptyBomLine()];
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

  const { data: catalog, loading } = useFetch(() => fetchBomCatalog(), []);
  const { data: uomsData, loading: uomsLoading } = useFetch(
    () => fetchUoms(undefined, false),
    []
  );
  const uoms = uomsData ?? [];

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

  function onProductChange(productId: string) {
    setFinishedItemId(productId);
    setVariantItemId("");
    const product = products.find((p) => p.id === productId);
    if (!reference.trim() && product) {
      setReference(product.description);
    }
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
      quantity: number;
      scrapPercent?: number;
      uomId?: string;
    }[] = [];
    for (const line of lines) {
      if (!line.componentItemId) continue;
      const lineQty = parseFloat(line.quantity);
      if (Number.isNaN(lineQty) || lineQty <= 0) {
        toast.error("Each component needs a positive quantity");
        return;
      }
      if (line.componentItemId === effectiveFinished) {
        toast.error("Finished product cannot be a component of itself");
        return;
      }
      const entry: {
        componentItemId: string;
        quantity: number;
        scrapPercent?: number;
        uomId?: string;
      } = {
        componentItemId: line.componentItemId,
        quantity: lineQty,
      };
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
              <ItemSearchSelect
                value={finishedItemId}
                onValueChange={onProductChange}
                options={productOptions}
                placeholder="Select product…"
                searchPlaceholder="Search product…"
              />
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
                    },
                    { value: "KIT" as const, label: "Kit" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-[var(--frappe-text)]"
                  >
                    <input
                      type="radio"
                      name="bomType"
                      value={opt.value}
                      checked={bomType === opt.value}
                      onChange={() => setBomType(opt.value)}
                      className="size-3.5 accent-[var(--frappe-primary)]"
                    />
                    {opt.label}
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
          description={`Quantities needed to produce ${quantity || "1"} finished ${stockUnit}. Scrap % increases required material.`}
        >
          <FrappeGridTable
            columns={[
              { key: "component", label: "Component" },
              { key: "uom", label: "Unit", className: "w-28" },
              { key: "qty", label: "Quantity", className: "w-24" },
              { key: "scrap", label: "Scrap %", className: "w-24" },
            ]}
            onAddRow={() => setLines((prev) => [...prev, emptyBomLine()])}
            addLabel="Add a line"
          >
            {lines.map((line, index) => {
              const item = itemById.get(line.componentItemId);
              return (
                <FrappeGridRow
                  key={index}
                  canRemove={lines.length > 1}
                  onRemove={() =>
                    setLines((prev) =>
                      prev.length <= 1
                        ? prev
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
                        });
                      }}
                      options={componentOptions}
                      placeholder="Select component…"
                      searchPlaceholder="Search component…"
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
                    />
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
                      className="h-8"
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
