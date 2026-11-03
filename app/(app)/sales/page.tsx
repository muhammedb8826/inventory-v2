"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import {
  FrappeFilterBar,
  FrappeListToolbar,
  FrappeButtonPrimary,
  FrappeButtonLink,
} from "@/components/frappe";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  FilterField,
  FilterSelect,
  filterControlClass,
} from "@/components/shared/filter-field";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { documentTotal } from "@/lib/document-utils";
import { formatCommissionRate, saleRepName } from "@/lib/sale-utils";
import { buildSalesListPath } from "@/lib/list-query";
import { apiList } from "@/lib/list-response";
import { fetchCustomers } from "@/lib/party-fetch";
import { useLocations } from "@/hooks/use-locations";
import type {
  PaymentMethod,
  Sale,
  SaleListTotals,
  UserAdmin,
} from "@/lib/types";
import { ListPageTotals } from "@/components/shared/list-page-totals";
import { useFetch } from "@/hooks/use-fetch";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ListSearchField } from "@/components/shared/list-search-field";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PlusIcon } from "lucide-react";

type SaleRow = Pick<
  Sale,
  | "id"
  | "paymentMethod"
  | "total"
  | "subtotal"
  | "totalAmount"
  | "createdAt"
  | "customer"
  | "location"
  | "status"
  | "soldByUser"
  | "soldBy"
  | "commissionPercent"
  | "commissionBasis"
  | "commissionAmount"
>;

export default function SalesPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canOnBehalf = hasPermission(user, "sales.on_behalf");

  const initialSoldBy = searchParams.get("soldByUserId") ?? "";
  const initialFrom = searchParams.get("from") ?? "";
  const initialTo = searchParams.get("to") ?? "";
  const [includeVoided, setIncludeVoided] = useState(false);
  const [soldByUserId, setSoldByUserId] = useState(initialSoldBy);
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const { data: users } = useFetch(
    () => (canOnBehalf ? apiList<UserAdmin>("/users") : Promise.resolve([])),
    [canOnBehalf]
  );
  const { data: customers } = useFetch(() => fetchCustomers(), []);
  const { data: locations } = useLocations();

  const activeUsers = useMemo(
    () => (users ?? []).filter((u) => u.isActive !== false),
    [users]
  );

  const { rows, meta, totals, setPage, setLimit, loading } = usePaginatedList<
    SaleRow,
    SaleListTotals
  >(
    (page, limit) =>
      buildSalesListPath(
        {
          from: from || undefined,
          to: to || undefined,
          includeVoided,
          soldByUserId: soldByUserId || undefined,
          customerId: customerId || undefined,
          locationId: locationId || undefined,
          paymentMethod: paymentMethod || undefined,
          search: debouncedSearch || undefined,
        },
        page,
        limit
      ),
    [
      from,
      to,
      includeVoided,
      soldByUserId,
      customerId,
      locationId,
      paymentMethod,
      debouncedSearch,
    ]
  );

  return (
    <AppShell
      title="Sales Invoice"
      subtitle="List of sales transactions"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Sales Invoice" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission="sales.read">
            <FrappeButtonLink href="/sales/commissions">Commissions</FrappeButtonLink>
          </PermissionGate>
          <PermissionGate permission="sales.write">
            <FrappeButtonPrimary asChild>
              <Link href="/sales/new">
                <PlusIcon className="size-3.5" />
                Add Sale
              </Link>
            </FrappeButtonPrimary>
          </PermissionGate>
        </div>
      }
    >
      <PermissionGate permission="sales.read" showDenied>
        <FrappeFilterBar
          search={
            <ListSearchField
              variant="toolbar"
              value={search}
              onChange={setSearch}
              placeholder="Search sales..."
            />
          }
          chips={[
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
            customerId
              ? {
                  id: "customer",
                  label:
                    customers?.find((c) => c.id === customerId)?.name ??
                    "Customer",
                  onRemove: () => setCustomerId(""),
                }
              : null,
            locationId
              ? {
                  id: "location",
                  label:
                    locations?.find((l) => l.id === locationId)?.name ??
                    "Location",
                  onRemove: () => setLocationId(""),
                }
              : null,
            paymentMethod
              ? {
                  id: "payment",
                  label: paymentMethod,
                  onRemove: () => setPaymentMethod(""),
                }
              : null,
            soldByUserId
              ? {
                  id: "rep",
                  label:
                    activeUsers.find((u) => u.id === soldByUserId)?.fullName ??
                    "Sales rep",
                  onRemove: () => setSoldByUserId(""),
                }
              : null,
            includeVoided
              ? {
                  id: "voided",
                  label: "Include voided",
                  onRemove: () => setIncludeVoided(false),
                }
              : null,
          ].filter(Boolean) as { id: string; label: string; onRemove: () => void }[]}
          onClearAll={() => {
            setFrom("");
            setTo("");
            setCustomerId("");
            setLocationId("");
            setPaymentMethod("");
            setSoldByUserId("");
            setIncludeVoided(false);
          }}
        >
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          <FilterSelect
            label="Customer"
            value={customerId}
            onValueChange={setCustomerId}
            allLabel="All customers"
            options={(customers ?? []).map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
          <FilterSelect
            label="Location"
            value={locationId}
            onValueChange={setLocationId}
            allLabel="All locations"
            options={(locations ?? []).map((l) => ({
              value: l.id,
              label: l.name,
            }))}
          />
          <FilterSelect
            label="Payment"
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as PaymentMethod | "")}
            allLabel="All payments"
            options={[
              { value: "CASH", label: "Cash" },
              { value: "BANK", label: "Bank" },
              { value: "CREDIT", label: "Credit" },
            ]}
          />
          {canOnBehalf ? (
            <FilterSelect
              label="Sales rep"
              value={soldByUserId}
              onValueChange={setSoldByUserId}
              allLabel="All reps"
              options={activeUsers.map((u) => ({
                value: u.id,
                label: u.fullName,
              }))}
            />
          ) : null}
          <FilterField label="Voided docs" htmlFor="include-voided">
            <div
              className={cn(
                filterControlClass,
                "flex items-center justify-between gap-2 px-3"
              )}
            >
              <span className="truncate text-sm text-[var(--erp-text)]">
                Include voided
              </span>
              <Switch
                id="include-voided"
                checked={includeVoided}
                onCheckedChange={setIncludeVoided}
              />
            </div>
          </FilterField>
        </FrappeFilterBar>

        <FrappeListToolbar>
          <span className="text-[var(--frappe-text-muted)]">
            {meta.total} record{meta.total === 1 ? "" : "s"}
          </span>
          {totals ? (
            <ListPageTotals
              items={[
                { label: "Subtotal", value: formatMoney(totals.subtotal) },
                { label: "Total", value: formatMoney(totals.total) },
                { label: "Commission", value: formatMoney(totals.commission) },
              ]}
            />
          ) : null}
        </FrappeListToolbar>
        {loading ? (
          <PageLoading />
        ) : (
          <DataCardTable
            rows={rows}
            emptyTitle="Nothing to show"
            emptyDescription="Create your first sale invoice."
            pagination={{
              meta,
              onPageChange: setPage,
              onLimitChange: setLimit,
              disabled: loading,
            }}
            columns={[
              {
                key: "id",
                header: "ID",
                cell: (r) => (
                  <Link
                    href={`/sales/${r.id}`}
                    className="font-medium text-[var(--frappe-primary)] hover:underline"
                  >
                    {r.id.slice(0, 8)}…
                  </Link>
                ),
              },
              {
                key: "date",
                header: "Date",
                cell: (r) => formatDate(r.createdAt),
              },
              {
                key: "customer",
                header: "Customer",
                primary: true,
                cell: (r) =>
                  r.customer?.name ? (
                    <Link
                      href={`/sales/${r.id}`}
                      className="hover:text-[var(--frappe-primary)] hover:underline"
                    >
                      {r.customer.name}
                    </Link>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "soldBy",
                header: "Sales rep",
                cell: (r) => saleRepName(r) ?? "—",
              },
              {
                key: "location",
                header: "Location",
                cell: (r) => r.location?.name ?? "—",
              },
              {
                key: "payment",
                header: "Payment",
                cell: (r) => r.paymentMethod,
              },
              {
                key: "status",
                header: "Status",
                cell: (r) =>
                  r.status === "VOIDED" ? (
                    <Badge variant="secondary">Voided</Badge>
                  ) : (
                    "Posted"
                  ),
              },
              {
                key: "commission",
                header: "Commission",
                className: "text-right tabular-nums",
                cell: (r) =>
                  r.commissionAmount
                    ? formatMoney(r.commissionAmount)
                    : formatCommissionRate(
                        r.commissionPercent,
                        r.commissionBasis
                      ) ?? "—",
              },
              {
                key: "total",
                header: "Amount",
                className: "text-right",
                cell: (r) => formatMoney(documentTotal(r)),
              },
            ]}
          />
        )}
      </PermissionGate>
    </AppShell>
  );
}
