"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import {
  FrappeButtonPrimary,
  FrappeFilterBar,
  FrappeListToolbar,
} from "@/components/frappe";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListRowActions } from "@/components/shared/list-row-actions";
import { EyeIcon, PlusIcon } from "lucide-react";
import { InquiryStatusBadge } from "@/components/inquiries/inquiry-status-badge";
import { buildInquiriesListPath } from "@/lib/list-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fetchCustomers } from "@/lib/party-fetch";
import { useFetch } from "@/hooks/use-fetch";
import {
  INQUIRY_STATUSES,
  inquiryItemsSummary,
  inquiryStatusLabel,
} from "@/lib/inquiries";
import { formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import type { Inquiry, InquiryStatus, UserAdmin } from "@/lib/types";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { AccessDenied } from "@/components/shared/access-denied";

export default function InquiriesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get("id");

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [customerId, setCustomerId] = useState("");
  const [createdById, setCreatedById] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const canRead = hasPermission(user, "inquiries.read");
  const { data: customers } = useFetch(
    () => fetchCustomers(),
    [],
    { enabled: canRead && hasPermission(user, "customers.read") }
  );
  const { data: users } = useFetch(
    () => api<UserAdmin[]>("/users/assignees"),
    [],
    { enabled: canRead }
  );
  useEffect(() => {
    if (!deepLinkId) return;
    router.replace(`/inquiries/${deepLinkId}`);
  }, [deepLinkId, router]);

  const { rows, meta, setPage, setLimit, loading } =
    usePaginatedList<Inquiry>(
      (page, limit) =>
        canRead
          ? buildInquiriesListPath(
              {
                from: from || undefined,
                to: to || undefined,
                search: debouncedSearch || undefined,
                status: status || undefined,
                customerId: customerId || undefined,
                createdById: createdById || undefined,
              },
              page,
              limit
            )
          : null,
      [
        canRead,
        from,
        to,
        debouncedSearch,
        status,
        customerId,
        createdById,
      ]
    );

  if (authLoading) {
    return (
      <AppShell title="Quotations">
        <PageLoading />
      </AppShell>
    );
  }

  if (!canRead) {
    return (
      <AppShell title="Quotations">
        <AccessDenied />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Quotations"
      subtitle="Staff-created customer quotations"
      breadcrumbs={[
        { label: "Qenenia ERP", href: "/dashboard" },
        { label: "Quotations" },
      ]}
      actions={
        <PermissionGate permission="inquiries.write">
          <FrappeButtonPrimary asChild>
            <Link href="/inquiries/new">
              <PlusIcon className="size-3.5" />
              New
            </Link>
          </FrappeButtonPrimary>
        </PermissionGate>
      }
    >
      <>
        <FrappeFilterBar
          search={
            <ListSearchField
              variant="toolbar"
              value={search}
              onChange={setSearch}
              placeholder="Search contact, phone, email, items, reference…"
            />
          }
        >
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          <Select
            value={status || "__all__"}
            onValueChange={(v) =>
              setStatus(v === "__all__" ? "" : (v as InquiryStatus))
            }
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {INQUIRY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {inquiryStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={customerId || "__all__"}
            onValueChange={(v) => setCustomerId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="All customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All customers</SelectItem>
              {(customers ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={createdById || "__all__"}
            onValueChange={(v) => setCreatedById(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Created by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All creators</SelectItem>
              {(users ?? []).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FrappeFilterBar>

        <FrappeListToolbar>
          <span className="text-[var(--frappe-text-muted)]">
            {meta.total} quotation{meta.total === 1 ? "" : "s"}
          </span>
        </FrappeListToolbar>

        {loading ? (
          <PageLoading />
        ) : (
          <DataCardTable
            rows={rows}
            emptyTitle="No quotations"
            emptyDescription="Create a quotation for a customer or walk-in."
            pagination={{
              meta,
              onPageChange: setPage,
              onLimitChange: setLimit,
              disabled: loading,
            }}
            columns={[
              {
                key: "createdAt",
                header: "Date",
                cell: (r) => formatDate(r.createdAt),
              },
              {
                key: "customer",
                header: "Customer",
                cell: (r) => (
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--frappe-text)]">
                      {r.customer?.name || r.contactName || "—"}
                    </div>
                    <div className="text-xs text-[var(--frappe-text-muted)]">
                      {r.phone || r.email || "—"}
                    </div>
                  </div>
                ),
              },
              {
                key: "items",
                header: "Items",
                cell: (r) => {
                  const summary = inquiryItemsSummary(r);
                  return (
                    <Link
                      href={`/inquiries/${r.id}`}
                      className="line-clamp-2 max-w-[280px] font-medium text-[var(--frappe-primary)] hover:underline"
                      title={summary}
                    >
                      {summary !== "—" ? summary : r.subject || "Quotation"}
                    </Link>
                  );
                },
              },
              {
                key: "reference",
                header: "Reference",
                cell: (r) => (
                  <span className="text-sm text-[var(--frappe-text-muted)]">
                    {r.reference?.trim() || "—"}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (r) => <InquiryStatusBadge status={r.status} />,
              },
              {
                key: "createdBy",
                header: "Created by",
                cell: (r) =>
                  r.createdBy?.fullName || r.createdBy?.email || "—",
              },
              {
                key: "actions",
                header: "",
                className: "w-12 text-right",
                cell: (r) => (
                  <ListRowActions
                    items={[
                      {
                        label: "Open",
                        icon: EyeIcon,
                        onSelect: () => router.push(`/inquiries/${r.id}`),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </>
    </AppShell>
  );
}
