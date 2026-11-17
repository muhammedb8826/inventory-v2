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
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
  fetchAllInventory,
  uniqueItemsFromStock,
} from "@/lib/inventory-fetch";
import { preferRicherItem, resolveItem } from "@/lib/inventory-items";
import { defaultUomIdForItem, fetchUoms } from "@/lib/uom";
import { errorMessage } from "@/lib/format";
import type { Bom, Item } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

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
  const [name, setName] = useState(bom?.name ?? "");
  const [version, setVersion] = useState(bom?.version ?? "1.0");
  const [notes, setNotes] = useState(bom?.notes ?? "");
  const [isActive, setIsActive] = useState(bom?.isActive !== false);
  const [lines, setLines] = useState<BomLineRow[]>(() =>
    bom ? linesFromBom(bom) : [emptyBomLine()]
  );
  const [saving, setSaving] = useState(false);

  const { data: stock, loading } = useFetch(() => fetchAllInventory(), []);
  const { data: uomsData, loading: uomsLoading } = useFetch(
    () => fetchUoms(undefined, false),
    []
  );
  const uoms = uomsData ?? [];

  const itemById = useMemo(() => {
    const map = new Map<string, Item>();
    if (bom?.finishedItem) {
      map.set(
        bom.finishedItemId,
        resolveItem(bom.finishedItemId, bom.finishedItem)
      );
    }
    for (const line of bom?.lines ?? []) {
      if (!line.componentItem) continue;
      map.set(
        line.componentItemId,
        preferRicherItem(
          map.get(line.componentItemId),
          resolveItem(line.componentItemId, line.componentItem)
        )
      );
    }
    for (const item of uniqueItemsFromStock(stock ?? [])) {
      map.set(item.id, preferRicherItem(map.get(item.id), item));
    }
    return map;
  }, [stock, bom]);

  const itemOptions = (() => {
    const items = uniqueItemsFromStock(stock ?? []);
    const options = items.map((item) => ({
      itemId: item.id,
      label: item.sku
        ? `${item.description} (${item.sku})`
        : item.description,
    }));
    const pushIfMissing = (itemId: string, label: string) => {
      if (!itemId || options.some((o) => o.itemId === itemId)) return;
      options.push({ itemId, label });
    };
    if (bom?.finishedItem) {
      pushIfMissing(
        bom.finishedItemId,
        bom.finishedItem.sku
          ? `${bom.finishedItem.description} (${bom.finishedItem.sku})`
          : bom.finishedItem.description
      );
    }
    for (const line of bom?.lines ?? []) {
      if (!line.componentItem) continue;
      pushIfMissing(
        line.componentItemId,
        line.componentItem.sku
          ? `${line.componentItem.description} (${line.componentItem.sku})`
          : line.componentItem.description
      );
    }
    return options;
  })();

  function updateLine(index: number, patch: Partial<BomLineRow>) {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("BOM name is required");
      return;
    }
    if (!finishedItemId) {
      toast.error("Select a finished item");
      return;
    }
    const parsedLines: {
      componentItemId: string;
      quantity: number;
      scrapPercent?: number;
      uomId?: string;
    }[] = [];
    for (const line of lines) {
      if (!line.componentItemId) continue;
      const quantity = parseFloat(line.quantity);
      if (Number.isNaN(quantity) || quantity <= 0) {
        toast.error("Each component needs a positive quantity");
        return;
      }
      if (line.componentItemId === finishedItemId) {
        toast.error("Finished item cannot be a component of itself");
        return;
      }
      const entry: {
        componentItemId: string;
        quantity: number;
        scrapPercent?: number;
        uomId?: string;
      } = {
        componentItemId: line.componentItemId,
        quantity,
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
        name: name.trim(),
        version: version.trim() || "1.0",
        notes: notes.trim() || undefined,
        isActive,
        lines: parsedLines,
      };
      if (isEdit && bom) {
        await api(`/boms/${bom.id}`, { method: "PATCH", body });
        toast.success("BOM updated");
        router.push(`/boms/${bom.id}`);
      } else {
        const created = await api<Bom>("/boms", { method: "POST", body });
        toast.success("BOM created");
        router.push(`/boms/${created.id}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !stock) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <FrappeDocument>
        <FrappeFormToolbar>
          <FrappeButtonLink href="/boms">Cancel</FrappeButtonLink>
          <FrappeButtonPrimary type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update" : "Save"}
          </FrappeButtonPrimary>
        </FrappeFormToolbar>

        <FrappeSection title="BOM">
          <FrappeFormGrid columns={2}>
            <FrappeField label="Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FrappeField>
            <FrappeField label="Version">
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </FrappeField>
            <FrappeField label="Finished item" required>
              <ItemSearchSelect
                value={finishedItemId}
                onValueChange={setFinishedItemId}
                options={itemOptions}
                placeholder="Select finished item…"
                searchPlaceholder="Search finished item…"
              />
            </FrappeField>
            <FrappeField label="Active">
              <div className="flex h-9 items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label className="text-sm text-[var(--erp-text-muted)]">
                  {isActive ? "Active" : "Inactive"}
                </Label>
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
          description="Quantities are per 1 finished unit (in the selected UOM). Scrap % increases required material."
        >
          <FrappeGridTable
            columns={[
              { key: "component", label: "Component" },
              { key: "uom", label: "UOM", className: "w-28" },
              { key: "qty", label: "Qty / FG", className: "w-24" },
              { key: "scrap", label: "Scrap %", className: "w-24" },
            ]}
            onAddRow={() => setLines((prev) => [...prev, emptyBomLine()])}
            addLabel="Add component"
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
                      options={itemOptions}
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
