"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { ItemCardGrid } from "@/components/shared/item-card-grid";
import { ListGridViewToggle } from "@/components/shared/list-grid-view-toggle";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import {
  FrappeButtonPrimary,
  FrappeFilterBar,
  FrappeListToolbar,
} from "@/components/frappe";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import { FilterSelect } from "@/components/shared/filter-field";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListViewMode } from "@/hooks/use-list-view-mode";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { buildInventoryListPath, buildLowStockListPath } from "@/lib/list-query";
import { isLowStockRow } from "@/lib/inventory-stock";
import { resolveItemImageUrl } from "@/lib/inventory-media";
import { ItemImage } from "@/components/shared/item-image";
import { formatMoney, formatQty, errorMessage } from "@/lib/format";
import { formatItemStockQtyWithLinear } from "@/lib/uom";
import type {
  InventoryListTotals,
  LowStockRecord,
  StockRecord,
} from "@/lib/types";
import { itemTypeLabel } from "@/lib/item-types";
import { formatItemAttributeLabel } from "@/lib/item-attributes";
import { ListPageTotals } from "@/components/shared/list-page-totals";
import { ListRowActions } from "@/components/shared/list-row-actions";
import { useLocations } from "@/hooks/use-locations";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportInventoryButton } from "@/components/inventory/export-inventory-button";
import { InventoryAdjustmentsPanel } from "@/components/inventory/inventory-adjustments-panel";
import { StockAdjustDialog } from "@/components/inventory/stock-adjust-dialog";
import { StockDetailDialog } from "@/components/inventory/stock-detail-dialog";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import {
  ArrowLeftRightIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

const ALL_LOCATIONS = "__all__";
const VIEW_ALL = "all";
const VIEW_LOW_STOCK = "low-stock";

export default function InventoryPage() {
  const { user } = useAuth();
  const [locationFilter, setLocationFilter] = useState(ALL_LOCATIONS);
  const [viewMode, setViewMode] = useState<typeof VIEW_ALL | typeof VIEW_LOW_STOCK>(
    VIEW_ALL
  );
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [displayMode, setDisplayMode] = useListViewMode(
    "inventory-list-view",
    "list"
  );
  const [detailRecord, setDetailRecord] = useState<
    StockRecord | LowStockRecord | null
  >(null);
  const debouncedSearch = useDebouncedValue(search);

  const { data: locations } = useLocations();

  const listLocationId =
    locationFilter === ALL_LOCATIONS ? undefined : locationFilter;
  const isAllLocations = locationFilter === ALL_LOCATIONS;

  const selectedLocation = (locations ?? []).find(
    (loc) => loc.id === listLocationId
  );
  const locationLabel = isAllLocations
    ? "all-locations"
    : selectedLocation
      ? `${selectedLocation.name}-${selectedLocation.type}`
      : "stock";

  const exportFilters = {
    locationId: listLocationId,
    from: from || undefined,
    to: to || undefined,
    search: debouncedSearch || undefined,
  };

  const isLowStockView = viewMode === VIEW_LOW_STOCK;

  const { rows, meta, totals, setPage, setLimit, loading, reload } =
    usePaginatedList<StockRecord | LowStockRecord, InventoryListTotals>(
    (page, limit) => {
      if (isLowStockView) {
        return buildLowStockListPath(
          { locationId: listLocationId },
          page,
          limit
        );
      }
      return buildInventoryListPath(
        {
          locationId: listLocationId,
          from: from || undefined,
          to: to || undefined,
          search: debouncedSearch || undefined,
        },
        page,
        limit
      );
    },
    [listLocationId, from, to, debouncedSearch, isLowStockView]
  );

  return (
    <AppShell
      title="Stock Ledger"
      subtitle="Warehouse and showroom quantities"
      breadcrumbs={[
        { label: "Qenenia ERP", href: "/dashboard" },
        { label: "Stock Ledger" },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate permission="inventory.write">
            <FrappeButtonPrimary asChild>
              <Link
                href={
                  listLocationId
                    ? `/inventory/new?locationId=${encodeURIComponent(listLocationId)}`
                    : "/inventory/new"
                }
              >
                <PlusIcon className="size-3.5" />
                Add item
              </Link>
            </FrappeButtonPrimary>
          </PermissionGate>
          <PermissionGate permission="inventory.read">
            <ExportInventoryButton
              filters={exportFilters}
              locationLabel={locationLabel}
              disabled={loading}
            />
          </PermissionGate>
          <PermissionGate permission="inventory.import">
            <ImportDialog
              locationId={listLocationId ?? ""}
              disabled={isAllLocations}
              onSuccess={reload}
            />
          </PermissionGate>
        </div>
      }
    >
      <PermissionGate permission="inventory.read" showDenied>
        <Tabs defaultValue="stock" className="gap-4">
          <TabsList>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
          </TabsList>
          <TabsContent value="stock" className="mt-0 space-y-0">
        <FrappeFilterBar
          search={
            <ListSearchField
              variant="toolbar"
              value={search}
              onChange={setSearch}
              placeholder="Search stock..."
              disabled={isLowStockView}
              className={isLowStockView ? "opacity-60" : undefined}
            />
          }
          chips={[
            !isAllLocations
              ? {
                  id: "location",
                  label:
                    locations?.find((l) => l.id === locationFilter)?.name ??
                    "Location",
                  onRemove: () => setLocationFilter(ALL_LOCATIONS),
                }
              : null,
            isLowStockView
              ? {
                  id: "view",
                  label: "Low stock",
                  onRemove: () => setViewMode(VIEW_ALL),
                }
              : null,
            from
              ? {
                  id: "from",
                  label: `From ${from}`,
                  onRemove: () => setFrom(""),
                }
              : null,
            to
              ? { id: "to", label: `To ${to}`, onRemove: () => setTo("") }
              : null,
          ].filter(Boolean) as { id: string; label: string; onRemove: () => void }[]}
          onClearAll={() => {
            setLocationFilter(ALL_LOCATIONS);
            setViewMode(VIEW_ALL);
            setFrom("");
            setTo("");
          }}
        >
          <FilterSelect
            label="Location"
            value={locationFilter}
            onValueChange={setLocationFilter}
            allLabel="All locations"
            allValue={ALL_LOCATIONS}
            keepAllValue
            options={(locations ?? []).map((loc) => ({
              value: loc.id,
              label: `${loc.name} (${loc.type})`,
            }))}
          />
          <FilterSelect
            label="View"
            value={viewMode}
            onValueChange={(v) =>
              setViewMode(v as typeof VIEW_ALL | typeof VIEW_LOW_STOCK)
            }
            options={[
              { value: VIEW_ALL, label: "All stock" },
              { value: VIEW_LOW_STOCK, label: "Low stock only" },
            ]}
          />
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            disabled={isLowStockView}
            className={isLowStockView ? "opacity-60" : undefined}
          />
        </FrappeFilterBar>
        <FrappeListToolbar>
          <span className="text-[var(--frappe-text-muted)]">
            {meta.total} {isLowStockView ? "low-stock item" : "item"}
            {meta.total === 1 ? "" : "s"}
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {!isLowStockView && totals ? (
              <ListPageTotals
                items={[
                  { label: "Total qty", value: formatQty(totals.quantity) },
                  {
                    label: "Stock value",
                    value: formatMoney(totals.inventoryValue),
                  },
                ]}
              />
            ) : null}
            <ListGridViewToggle
              value={displayMode}
              onValueChange={setDisplayMode}
            />
          </div>
        </FrappeListToolbar>
        {loading ? (
          <PageLoading />
        ) : displayMode === "grid" ? (
          <>
            <ItemCardGrid
              rows={rows}
              emptyTitle={
                isLowStockView
                  ? "No low-stock items"
                  : isAllLocations
                    ? "No stock found"
                    : "No stock at this location"
              }
              emptyDescription={
                isLowStockView
                  ? "Items at or below their reorder point will appear here."
                  : undefined
              }
              pagination={{
                meta,
                onPageChange: setPage,
                onLimitChange: setLimit,
                disabled: loading,
              }}
              getImage={(r) =>
                resolveItemImageUrl(r.item.imageUrl ?? r.item.imagePath)
              }
              getTitle={(r) => r.item.description}
              getSubtitle={(r) =>
                [
                  isAllLocations ? r.location?.name : null,
                  formatItemAttributeLabel(r.item.attributeValues) || null,
                  r.item.sku ? `SKU: ${r.item.sku}` : null,
                  r.item.itemType ? itemTypeLabel(r.item.itemType) : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || null
              }
              renderBadges={(r) => {
                const lowRow = r as LowStockRecord;
                const showLowBadge =
                  isLowStockView || isLowStockRow(r as StockRecord);
                if (!showLowBadge) return null;
                const out =
                  lowRow.status === "OUT_OF_STOCK" ||
                  parseFloat(r.quantity) <= 0;
                return (
                  <Badge
                    variant={out ? "destructive" : "secondary"}
                    className="text-[10px] font-normal shadow-sm"
                  >
                    {out ? "Out of stock" : "Low stock"}
                  </Badge>
                );
              }}
              renderMeta={(r) => (
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-[var(--erp-text-muted)]">
                      Qty
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatItemStockQtyWithLinear(r, formatQty)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-[var(--erp-text-muted)]">
                      Price
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(r.purchasePrice)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-[var(--erp-text-muted)]">
                      Value
                    </span>
                    <span className="font-medium tabular-nums text-[var(--qenenia-navy)]">
                      {formatMoney(
                        parseFloat(r.quantity) * parseFloat(r.purchasePrice)
                      )}
                    </span>
                  </div>
                  {isLowStockView ? (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-[var(--erp-text-muted)]">
                        Shortage
                      </span>
                      <span className="tabular-nums">
                        {formatQty((r as LowStockRecord).shortage)}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
              renderActions={(r) => (
                <StockRowActions record={r} onSuccess={reload} />
              )}
              onCardClick={(r) => setDetailRecord(r)}
            />
            {detailRecord ? (
              <StockDetailDialog
                record={detailRecord}
                open={Boolean(detailRecord)}
                onOpenChange={(next) => {
                  if (!next) setDetailRecord(null);
                }}
              />
            ) : null}
          </>
        ) : (
          <DataCardTable
            rows={rows}
            emptyTitle={
              isLowStockView
                ? "No low-stock items"
                : isAllLocations
                  ? "No stock found"
                  : "No stock at this location"
            }
            emptyDescription={
              isLowStockView
                ? "Items at or below their reorder point will appear here."
                : undefined
            }
            pagination={{
              meta,
              onPageChange: setPage,
              onLimitChange: setLimit,
              disabled: loading,
            }}
            columns={[
              ...(isAllLocations
                ? [
                    {
                      key: "location",
                      header: "Location",
                      cell: (r: StockRecord) => r.location?.name ?? "—",
                    },
                  ]
                : []),
              {
                key: "item",
                header: "Item",
                primary: true,
                cell: (r) => {
                  const imageSrc = resolveItemImageUrl(
                    r.item.imageUrl ?? r.item.imagePath
                  );
                  return (
                    <StockDetailDialog
                      record={r}
                      trigger={
                        <button
                          type="button"
                          className="flex max-w-full items-center gap-3 text-left"
                        >
                          <ItemImage src={imageSrc} size="sm" alt="" />
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--frappe-primary)] hover:underline">
                              {r.item.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[
                                formatItemAttributeLabel(
                                  r.item.attributeValues
                                ) || null,
                                r.item.sku ? `SKU: ${r.item.sku}` : null,
                                r.item.itemType
                                  ? itemTypeLabel(r.item.itemType)
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || null}
                            </p>
                          </div>
                        </button>
                      }
                    />
                  );
                },
              },
              {
                key: "qty",
                header: "Quantity",
                secondary: true,
                className: "w-28 text-right tabular-nums",
                cell: (r) => {
                  const lowRow = r as LowStockRecord;
                  const showLowBadge =
                    isLowStockView || isLowStockRow(r as StockRecord);
                  return (
                    <div className="flex flex-col items-end gap-1">
                      <span>
                        {formatItemStockQtyWithLinear(r, formatQty)}
                      </span>
                      {showLowBadge ? (
                        <Badge
                          variant={
                            lowRow.status === "OUT_OF_STOCK" ||
                            parseFloat(r.quantity) <= 0
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] font-normal"
                        >
                          {lowRow.status === "OUT_OF_STOCK" ||
                          parseFloat(r.quantity) <= 0
                            ? "Out of stock"
                            : "Low stock"}
                        </Badge>
                      ) : null}
                    </div>
                  );
                },
              },
              {
                key: "reorder",
                header: "Reorder at",
                className: "w-28 text-right tabular-nums",
                cell: (r) =>
                  r.reorderPoint != null && r.reorderPoint !== ""
                    ? formatQty(r.reorderPoint)
                    : "—",
              },
              ...(isLowStockView
                ? [
                    {
                      key: "shortage",
                      header: "Shortage",
                      className: "w-28 text-right tabular-nums",
                      cell: (r: StockRecord | LowStockRecord) =>
                        formatQty((r as LowStockRecord).shortage),
                    },
                  ]
                : []),
              {
                key: "price",
                header: "Purchase price",
                className: "w-36 text-right tabular-nums",
                cell: (r) => formatMoney(r.purchasePrice),
              },
              {
                key: "value",
                header: "Value",
                className: "w-36 text-right tabular-nums",
                cell: (r) =>
                  formatMoney(
                    parseFloat(r.quantity) * parseFloat(r.purchasePrice)
                  ),
              },
              {
                key: "actions",
                header: "",
                className: "w-12 text-right",
                cell: (r) => (
                  <StockRowActions record={r} onSuccess={reload} />
                ),
              },
            ]}
          />
        )}
          </TabsContent>
          <TabsContent value="adjustments" className="mt-0">
            <InventoryAdjustmentsPanel />
          </TabsContent>
        </Tabs>
      </PermissionGate>
    </AppShell>
  );
}

function ImportDialog({
  locationId,
  onSuccess,
  disabled,
}: {
  locationId: string;
  onSuccess: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !locationId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api(`/inventory/import?locationId=${locationId}`, {
        method: "POST",
        body: form,
      });
      toast.success("Import completed");
      setOpen(false);
      setFile(null);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <UploadIcon />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleImport}>
          <DialogHeader>
            <DialogTitle>Bulk import</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            Columns: description, quantity, purchasePrice (or price). Optional:
            sku, reorderPoint (or reorder_point), itemType (RAW, SEMI,
            FINISHED, OTHER), imageUrl. For images, insert a picture on the
            data row in the .xlsx file (preferred), or put a public http/https
            link in imageUrl. JPEG/PNG/GIF up to 5 MB.
          </p>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={uploading || !file}>
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StockRowActions({
  record,
  onSuccess,
}: {
  record: StockRecord | LowStockRecord;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [detailOpen, setDetailOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api(`/inventory/${record.id}`, { method: "DELETE" });
      toast.success("Deleted");
      setDeleteOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ListRowActions
        items={[
          {
            label: "View",
            icon: EyeIcon,
            onSelect: () => setDetailOpen(true),
          },
          {
            label: "Adjust",
            icon: ArrowLeftRightIcon,
            onSelect: () => setAdjustOpen(true),
            hidden: !hasPermission(user, "inventory.adjust"),
          },
          {
            label: "Edit",
            icon: PencilIcon,
            href: `/inventory/${record.id}/edit`,
            hidden: !hasPermission(user, "inventory.write"),
          },
          {
            label: "Delete",
            icon: Trash2Icon,
            destructive: true,
            onSelect: () => setDeleteOpen(true),
            hidden: !hasPermission(user, "inventory.delete"),
          },
        ]}
      />
      <StockDetailDialog
        record={record}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <StockAdjustDialog
        record={record}
        onSuccess={onSuccess}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stock record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the stock entry for this location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
