"use client";

import { useState } from "react";
import { DataCardTable } from "@/components/shared/data-card-table";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import { FilterSelect } from "@/components/shared/filter-field";
import { PageLoading } from "@/components/shared/page-loading";
import { FrappeFilterBar, FrappeListToolbar } from "@/components/frappe";
import { Badge } from "@/components/ui/badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useLocations } from "@/hooks/use-locations";
import {
  STOCK_ADJUSTMENT_REASON_OPTIONS,
  stockAdjustmentReasonLabel,
} from "@/lib/inventory-adjustments";
import { buildInventoryAdjustmentsListPath } from "@/lib/list-query";
import { formatDate, formatQty } from "@/lib/format";
import type {
  StockAdjustment,
  StockAdjustmentDirection,
  StockAdjustmentReason,
} from "@/lib/types";

const ALL = "__all__";

export function InventoryAdjustmentsPanel() {
  const [locationId, setLocationId] = useState(ALL);
  const [direction, setDirection] = useState<StockAdjustmentDirection | "">(
    ""
  );
  const [reason, setReason] = useState<StockAdjustmentReason | "">("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: locations } = useLocations();

  const { rows, meta, setPage, setLimit, loading } =
    usePaginatedList<StockAdjustment>(
      (page, limit) =>
        buildInventoryAdjustmentsListPath(
          {
            locationId: locationId === ALL ? undefined : locationId,
            direction: direction || undefined,
            reason: reason || undefined,
            search: debouncedSearch || undefined,
            from: from || undefined,
            to: to || undefined,
          },
          page,
          limit
        ),
      [locationId, direction, reason, debouncedSearch, from, to]
    );

  return (
    <div className="space-y-3">
      <FrappeFilterBar
        search={
          <ListSearchField
            variant="toolbar"
            value={search}
            onChange={setSearch}
            placeholder="Search notes or reference…"
          />
        }
        chips={[
          locationId !== ALL
            ? {
                id: "location",
                label:
                  locations?.find((l) => l.id === locationId)?.name ??
                  "Location",
                onRemove: () => setLocationId(ALL),
              }
            : null,
          direction
            ? {
                id: "direction",
                label: direction === "in" ? "In" : "Out",
                onRemove: () => setDirection(""),
              }
            : null,
          reason
            ? {
                id: "reason",
                label: stockAdjustmentReasonLabel(reason),
                onRemove: () => setReason(""),
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
        ].filter(Boolean) as {
          id: string;
          label: string;
          onRemove: () => void;
        }[]}
        onClearAll={() => {
          setLocationId(ALL);
          setDirection("");
          setReason("");
          setFrom("");
          setTo("");
        }}
      >
        <FilterSelect
          label="Location"
          value={locationId}
          onValueChange={setLocationId}
          allLabel="All locations"
          allValue={ALL}
          keepAllValue
          options={(locations ?? []).map((loc) => ({
            value: loc.id,
            label: `${loc.name} (${loc.type})`,
          }))}
        />
        <FilterSelect
          label="Direction"
          value={direction}
          onValueChange={(v) =>
            setDirection(v as StockAdjustmentDirection | "")
          }
          allLabel="All"
          options={[
            { value: "in", label: "In" },
            { value: "out", label: "Out" },
          ]}
        />
        <FilterSelect
          label="Reason"
          value={reason}
          onValueChange={(v) => setReason(v as StockAdjustmentReason | "")}
          allLabel="All reasons"
          options={STOCK_ADJUSTMENT_REASON_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </FrappeFilterBar>
      <FrappeListToolbar>
        <span className="text-[var(--frappe-text-muted)]">
          {meta.total} adjustment{meta.total === 1 ? "" : "s"}
        </span>
      </FrappeListToolbar>
      {loading ? (
        <PageLoading />
      ) : (
        <DataCardTable
          rows={rows}
          emptyTitle="No adjustments"
          emptyDescription="Post an adjustment from a stock row to change quantity with an audit trail."
          pagination={{
            meta,
            onPageChange: setPage,
            onLimitChange: setLimit,
            disabled: loading,
          }}
          columns={[
            {
              key: "date",
              header: "Date",
              cell: (r) => formatDate(r.createdAt),
            },
            {
              key: "item",
              header: "Item",
              primary: true,
              cell: (r) =>
                r.item?.description ??
                (r.itemId ? `${r.itemId.slice(0, 8)}…` : "—"),
            },
            {
              key: "location",
              header: "Location",
              cell: (r) => r.location?.name ?? "—",
            },
            {
              key: "direction",
              header: "Direction",
              cell: (r) => (
                <Badge variant="outline">
                  {r.direction === "in" ? "In" : "Out"}
                </Badge>
              ),
            },
            {
              key: "reason",
              header: "Reason",
              cell: (r) => stockAdjustmentReasonLabel(r.reason),
            },
            {
              key: "qty",
              header: "Qty",
              className: "text-right tabular-nums",
              cell: (r) => formatQty(r.quantity),
            },
            {
              key: "notes",
              header: "Notes",
              cell: (r) => r.notes ?? r.reference ?? "—",
            },
          ]}
        />
      )}
    </div>
  );
}
