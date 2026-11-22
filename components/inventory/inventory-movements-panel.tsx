"use client";

import { useState } from "react";
import Link from "next/link";
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
  STOCK_MOVEMENT_REF_OPTIONS,
  stockMovementHref,
  stockMovementRefLabel,
} from "@/lib/stock-movements";
import { buildInventoryMovementsListPath } from "@/lib/list-query";
import { formatDate, formatQty } from "@/lib/format";
import type { StockMovement, StockMovementRefType } from "@/lib/types";

const ALL = "__all__";

export function InventoryMovementsPanel() {
  const [locationId, setLocationId] = useState(ALL);
  const [refType, setRefType] = useState<StockMovementRefType | "">("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: locations } = useLocations();

  const { rows, meta, setPage, setLimit, loading } =
    usePaginatedList<StockMovement>(
      (page, limit) =>
        buildInventoryMovementsListPath(
          {
            locationId: locationId === ALL ? undefined : locationId,
            refType: refType || undefined,
            search: debouncedSearch || undefined,
            from: from || undefined,
            to: to || undefined,
          },
          page,
          limit
        ),
      [locationId, refType, debouncedSearch, from, to]
    );

  return (
    <div className="space-y-3">
      <FrappeFilterBar
        search={
          <ListSearchField
            variant="toolbar"
            value={search}
            onChange={setSearch}
            placeholder="Search item or notes…"
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
          refType
            ? {
                id: "refType",
                label: stockMovementRefLabel(refType),
                onRemove: () => setRefType(""),
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
          setRefType("");
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
          label="Source"
          value={refType}
          onValueChange={(v) => setRefType(v as StockMovementRefType | "")}
          allLabel="All sources"
          options={STOCK_MOVEMENT_REF_OPTIONS.map((option) => ({
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
          {meta.total} movement{meta.total === 1 ? "" : "s"}
        </span>
      </FrappeListToolbar>
      {loading ? (
        <PageLoading />
      ) : (
        <DataCardTable
          rows={rows}
          emptyTitle="No stock movements"
          emptyDescription="Movements appear when sales, purchases, transfers, production, or adjustments change stock."
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
              key: "source",
              header: "Source",
              cell: (r) => {
                const href = stockMovementHref(r.refType, r.refId);
                const label = stockMovementRefLabel(r.refType);
                return href ? (
                  <Link
                    href={href}
                    className="text-[var(--frappe-primary)] hover:underline"
                  >
                    {label}
                  </Link>
                ) : (
                  <Badge variant="outline">{label}</Badge>
                );
              },
            },
            {
              key: "delta",
              header: "Change",
              className: "text-right tabular-nums",
              cell: (r) => {
                const n = parseFloat(r.quantityDelta);
                const sign = n > 0 ? "+" : "";
                return `${sign}${formatQty(r.quantityDelta)}`;
              },
            },
            {
              key: "after",
              header: "Balance",
              className: "text-right tabular-nums",
              cell: (r) => formatQty(r.quantityAfter),
            },
            {
              key: "notes",
              header: "Notes",
              cell: (r) => r.notes ?? "—",
            },
          ]}
        />
      )}
    </div>
  );
}
