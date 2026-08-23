"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import { FrappeFilterBar, FrappeListToolbar } from "@/components/frappe";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InquiryCreateDialog } from "@/components/inquiries/inquiry-create-dialog";
import { InquiryDetailDialog } from "@/components/inquiries/inquiry-detail-dialog";
import {
  InquiryPriorityBadge,
  InquirySourceBadge,
  InquiryStatusBadge,
} from "@/components/inquiries/inquiry-status-badge";
import { buildInquiriesListPath } from "@/lib/list-query";
import { INQUIRY_PRIORITIES, INQUIRY_STATUSES } from "@/lib/inquiries";
import { formatDate } from "@/lib/format";
import type {
  Inquiry,
  InquiryPriority,
  InquirySource,
  InquiryStatus,
} from "@/lib/types";
import { usePaginatedList } from "@/hooks/use-paginated-list";

export default function InquiriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get("id");

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [source, setSource] = useState<InquirySource | "">("");
  const [priority, setPriority] = useState<InquiryPriority | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (!deepLinkId) return;
    setSelectedId(deepLinkId);
    setDetailOpen(true);
  }, [deepLinkId]);

  const { rows, meta, setPage, setLimit, loading, reload } =
    usePaginatedList<Inquiry>(
      (page, limit) =>
        buildInquiriesListPath(
          {
            from: from || undefined,
            to: to || undefined,
            search: debouncedSearch || undefined,
            status: status || undefined,
            source: source || undefined,
            priority: priority || undefined,
          },
          page,
          limit
        ),
      [from, to, debouncedSearch, status, source, priority]
    );

  function openInquiry(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function handleDetailOpenChange(open: boolean) {
    setDetailOpen(open);
    if (!open && deepLinkId) {
      router.replace("/inquiries");
    }
  }

  return (
    <AppShell
      title="Inquiries"
      subtitle="Leads and product questions from the website and walk-ins"
      breadcrumbs={[
        { label: "Home", href: "/dashboard" },
        { label: "Inquiries" },
      ]}
      actions={
        <PermissionGate permission="inquiries.write">
          <InquiryCreateDialog
            onSuccess={(inquiry) => {
              reload();
              if (inquiry?.id) openInquiry(inquiry.id);
            }}
          />
        </PermissionGate>
      }
    >
      <PermissionGate permission="inquiries.read">
        <FrappeFilterBar>
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder="Search name, phone, email, subject…"
          />
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
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {INQUIRY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={source || "__all__"}
            onValueChange={(v) =>
              setSource(v === "__all__" ? "" : (v as InquirySource))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All sources</SelectItem>
              <SelectItem value="PUBLIC">Public</SelectItem>
              <SelectItem value="INTERNAL">Internal</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={priority || "__all__"}
            onValueChange={(v) =>
              setPriority(v === "__all__" ? "" : (v as InquiryPriority))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All priorities</SelectItem>
              {INQUIRY_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FrappeFilterBar>

        <FrappeListToolbar>
          <span className="text-[var(--frappe-text-muted)]">
            {meta.total} inquir{meta.total === 1 ? "y" : "ies"}
          </span>
        </FrappeListToolbar>

        {loading ? (
          <PageLoading />
        ) : (
          <DataCardTable
            rows={rows}
            emptyTitle="No inquiries"
            emptyDescription="Public website forms and walk-in leads will show up here."
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
                key: "contact",
                header: "Contact",
                cell: (r) => (
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--frappe-text)]">
                      {r.contactName}
                    </div>
                    <div className="text-xs text-[var(--frappe-text-muted)]">
                      {r.phone || r.email || "—"}
                    </div>
                  </div>
                ),
              },
              {
                key: "subject",
                header: "Subject",
                cell: (r) => (
                  <button
                    type="button"
                    className="max-w-[280px] truncate text-left font-medium text-[var(--frappe-primary)] hover:underline"
                    onClick={() => openInquiry(r.id)}
                  >
                    {r.subject}
                  </button>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (r) => <InquiryStatusBadge status={r.status} />,
              },
              {
                key: "priority",
                header: "Priority",
                cell: (r) => <InquiryPriorityBadge priority={r.priority} />,
              },
              {
                key: "source",
                header: "Source",
                cell: (r) => <InquirySourceBadge source={r.source} />,
              },
              {
                key: "assigned",
                header: "Assigned",
                cell: (r) =>
                  r.assignedTo?.fullName ||
                  r.assignedTo?.email ||
                  "—",
              },
              {
                key: "actions",
                header: "",
                className: "w-20 text-right",
                cell: (r) => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openInquiry(r.id)}
                  >
                    Open
                  </Button>
                ),
              },
            ]}
          />
        )}

        <InquiryDetailDialog
          inquiryId={selectedId}
          open={detailOpen}
          onOpenChange={handleDetailOpenChange}
          onChanged={reload}
        />
      </PermissionGate>
    </AppShell>
  );
}
