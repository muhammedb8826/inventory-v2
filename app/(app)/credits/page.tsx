"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import { FrappeFilterBar, FrappeListToolbar } from "@/components/frappe";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import { FilterSelect } from "@/components/shared/filter-field";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/shared/search-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { fetchCustomers, fetchSuppliers } from "@/lib/party-fetch";
import { creditBalance } from "@/lib/document-utils";
import {
  buildCreditsCustomersListPath,
  buildCreditsSuppliersListPath,
} from "@/lib/list-query";
import { formatMoney, formatDate, errorMessage } from "@/lib/format";
import type {
  CreditListTotals,
  CreditRecord,
  CreditSource,
  CreditStatus,
} from "@/lib/types";
import { ListPageTotals } from "@/components/shared/list-page-totals";
import { useFetch } from "@/hooks/use-fetch";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CreditPaymentDialog } from "@/components/credits/credit-payment-dialog";
import { PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

function creditSourceLabel(r: CreditRecord, partyKey: "customer" | "supplier") {
  if (r.source === "OPENING") return "Opening";
  if (r.source === "PURCHASE" || partyKey === "supplier") return "Purchase";
  return "Sale";
}

function creditStatusBadge(status: CreditStatus) {
  const variant =
    status === "PAID"
      ? "secondary"
      : status === "PARTIAL"
        ? "outline"
        : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}

function isCreditOverdue(record: CreditRecord): boolean {
  if (record.status === "PAID" || !record.dueDate) return false;
  const due = new Date(record.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function creditDetailHref(
  partyKey: "customer" | "supplier",
  id: string
) {
  return partyKey === "customer"
    ? `/credits/customers/${id}`
    : `/credits/suppliers/${id}`;
}

function creditColumns(
  partyKey: "customer" | "supplier",
  onSuccess: () => void
) {
  const sourceKey = partyKey === "customer" ? "sale" : "purchase";
  const sourceLabel = partyKey === "customer" ? "Sale" : "Purchase";
  const sourceHref = (r: CreditRecord) => {
    const id =
      partyKey === "customer"
        ? (r.saleId ?? r.sale?.id)
        : (r.purchaseId ?? r.purchase?.id);
    if (!id) return null;
    return partyKey === "customer" ? `/sales/${id}` : `/purchases/${id}`;
  };

  return [
    {
      key: "party",
      header: partyKey === "customer" ? "Customer" : "Supplier",
      primary: true,
      cell: (r: CreditRecord) => {
        const party = partyKey === "customer" ? r.customer : r.supplier;
        if (!party?.name) return "—";
        return (
          <div className="min-w-0">
            <Link
              href={creditDetailHref(partyKey, r.id)}
              className="font-medium text-[var(--frappe-primary)] hover:underline"
            >
              {party.name}
            </Link>
            {party.phone ? (
              <div className="text-xs text-[var(--frappe-text-muted)]">
                {party.phone}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: sourceKey,
      header: sourceLabel,
      cell: (r: CreditRecord) => {
        const href = sourceHref(r);
        const doc = partyKey === "customer" ? r.sale : r.purchase;
        if (r.source === "OPENING" || !href) {
          return (
            <Link
              href={creditDetailHref(partyKey, r.id)}
              className="font-medium text-[var(--frappe-primary)] hover:underline"
            >
              {r.source === "OPENING" ? "Opening" : "View"}
            </Link>
          );
        }
        return (
          <div className="min-w-0">
            <Link
              href={creditDetailHref(partyKey, r.id)}
              className="font-medium text-[var(--frappe-primary)] hover:underline"
            >
              {doc?.createdAt
                ? formatDate(doc.createdAt)
                : href.split("/").pop()?.slice(0, 8) + "…"}
            </Link>
            <div>
              <Link
                href={href}
                className="text-xs text-[var(--frappe-text-muted)] hover:underline"
              >
                Invoice
              </Link>
            </div>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Credit date",
      cell: (r: CreditRecord) => (
        <Link
          href={creditDetailHref(partyKey, r.id)}
          className="hover:underline"
        >
          {formatDate(r.createdAt)}
        </Link>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (r: CreditRecord) => (
        <div className="min-w-0">
          <Badge variant={r.source === "OPENING" ? "secondary" : "outline"}>
            {creditSourceLabel(r, partyKey)}
          </Badge>
          {r.reference ? (
            <div className="mt-0.5 text-xs text-[var(--frappe-text-muted)]">
              {r.reference}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "dueDate",
      header: "Due date",
      cell: (r: CreditRecord) => (
        <span
          className={cn(
            isCreditOverdue(r) && "font-medium text-[var(--frappe-red)]"
          )}
        >
          {formatDate(r.dueDate)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      cell: (r: CreditRecord) => formatMoney(r.amount),
    },
    {
      key: "paid",
      header: "Paid",
      className: "text-right",
      cell: (r: CreditRecord) => formatMoney(r.paidAmount),
    },
    {
      key: "balance",
      header: "Balance",
      className: "text-right",
      cell: (r: CreditRecord) => formatMoney(creditBalance(r)),
    },
    {
      key: "status",
      header: "Status",
      cell: (r: CreditRecord) => creditStatusBadge(r.status),
    },
    {
      key: "pay",
      header: "",
      cell: (r: CreditRecord) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === "PAID" ? null : (
            <PermissionGate permission="credit.write">
              <CreditPaymentDialog
                type={partyKey}
                credit={r}
                onSuccess={onSuccess}
              />
            </PermissionGate>
          )}
          {parseFloat(r.paidAmount) > 0 ? (
            <PermissionGate permission="credit.write">
              <VoidPaymentsButton
                type={partyKey}
                credit={r}
                onSuccess={onSuccess}
              />
            </PermissionGate>
          ) : null}
          {r.source === "OPENING" ? (
            <PermissionGate permission="credit.write">
              <DeleteOpeningCreditButton
                type={partyKey}
                credit={r}
                onSuccess={onSuccess}
              />
            </PermissionGate>
          ) : null}
        </div>
      ),
    },
  ];
}

export default function CreditsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CreditStatus | "">("");
  const [source, setSource] = useState<CreditSource | "">("");
  const [tab, setTab] = useState<"customers" | "suppliers">("customers");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  function handleTabChange(next: "customers" | "suppliers") {
    setTab(next);
    // SALE only applies to customers, PURCHASE only to suppliers.
    if (
      (next === "suppliers" && source === "SALE") ||
      (next === "customers" && source === "PURCHASE")
    ) {
      setSource("");
    }
  }


  const customerList = usePaginatedList<CreditRecord, CreditListTotals>(
    (page, limit) =>
      buildCreditsCustomersListPath(
        {
          from: from || undefined,
          to: to || undefined,
          search: debouncedSearch || undefined,
          status: status || undefined,
          source: source || undefined,
        },
        page,
        limit
      ),
    [from, to, debouncedSearch, status, source]
  );
  const supplierList = usePaginatedList<CreditRecord, CreditListTotals>(
    (page, limit) =>
      buildCreditsSuppliersListPath(
        {
          from: from || undefined,
          to: to || undefined,
          search: debouncedSearch || undefined,
          status: status || undefined,
          source: source || undefined,
        },
        page,
        limit
      ),
    [from, to, debouncedSearch, status, source]
  );

  const reloadAll = () => {
    customerList.reload();
    supplierList.reload();
  };

  return (
    <AppShell title="Credits">
      <PermissionGate permission="credit.read" showDenied>
        <FrappeFilterBar
          search={
            <ListSearchField
              variant="toolbar"
              value={search}
              onChange={setSearch}
              placeholder="Search credits..."
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
            status
              ? {
                  id: "status",
                  label: status,
                  onRemove: () => setStatus(""),
                }
              : null,
            source
              ? {
                  id: "source",
                  label: source,
                  onRemove: () => setSource(""),
                }
              : null,
          ].filter(Boolean) as { id: string; label: string; onRemove: () => void }[]}
          onClearAll={() => {
            setFrom("");
            setTo("");
            setStatus("");
            setSource("");
          }}
        >
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          <FilterSelect
            label="Status"
            value={status}
            onValueChange={(v) => setStatus(v as CreditStatus | "")}
            allLabel="All statuses"
            options={[
              { value: "OPEN", label: "Open" },
              { value: "PARTIAL", label: "Partial" },
              { value: "PAID", label: "Paid" },
            ]}
          />
          <FilterSelect
            label="Source"
            value={source}
            onValueChange={(v) => setSource(v as CreditSource | "")}
            allLabel="All sources"
            options={[
              {
                value: tab === "customers" ? "SALE" : "PURCHASE",
                label: tab === "customers" ? "From sale" : "From purchase",
              },
              { value: "OPENING", label: "Opening balance" },
            ]}
          />
        </FrappeFilterBar>
        <Tabs
          value={tab}
          onValueChange={(v) => handleTabChange(v as "customers" | "suppliers")}
        >
          <TabsList>
            <TabsTrigger value="customers">Customer credit</TabsTrigger>
            <TabsTrigger value="suppliers">Supplier credit</TabsTrigger>
          </TabsList>
          <TabsContent value="customers" className="mt-4">
            <FrappeListToolbar>
              <span className="text-[var(--frappe-text-muted)]">
                {customerList.meta.total} record
                {customerList.meta.total === 1 ? "" : "s"}
              </span>
              {customerList.totals ? (
                <ListPageTotals
                  items={[
                    {
                      label: "Amount",
                      value: formatMoney(customerList.totals.amount),
                    },
                    {
                      label: "Paid",
                      value: formatMoney(customerList.totals.paidAmount),
                    },
                    {
                      label: "Balance",
                      value: formatMoney(customerList.totals.balance),
                    },
                  ]}
                />
              ) : null}
              <PermissionGate permission="credit.write">
                <OpeningCreditDialog type="customer" onSuccess={reloadAll} />
              </PermissionGate>
            </FrappeListToolbar>
            {customerList.loading ? (
              <PageLoading />
            ) : (
              <DataCardTable
                rows={customerList.rows}
                emptyTitle="No customer credits"
                pagination={{
                  meta: customerList.meta,
                  onPageChange: customerList.setPage,
                  onLimitChange: customerList.setLimit,
                  disabled: customerList.loading,
                }}
                columns={creditColumns("customer", reloadAll)}
              />
            )}
          </TabsContent>
          <TabsContent value="suppliers" className="mt-4">
            <FrappeListToolbar>
              <span className="text-[var(--frappe-text-muted)]">
                {supplierList.meta.total} record
                {supplierList.meta.total === 1 ? "" : "s"}
              </span>
              {supplierList.totals ? (
                <ListPageTotals
                  items={[
                    {
                      label: "Amount",
                      value: formatMoney(supplierList.totals.amount),
                    },
                    {
                      label: "Paid",
                      value: formatMoney(supplierList.totals.paidAmount),
                    },
                    {
                      label: "Balance",
                      value: formatMoney(supplierList.totals.balance),
                    },
                  ]}
                />
              ) : null}
              <PermissionGate permission="credit.write">
                <OpeningCreditDialog type="supplier" onSuccess={reloadAll} />
              </PermissionGate>
            </FrappeListToolbar>
            {supplierList.loading ? (
              <PageLoading />
            ) : (
              <DataCardTable
                rows={supplierList.rows}
                emptyTitle="No supplier credits"
                pagination={{
                  meta: supplierList.meta,
                  onPageChange: supplierList.setPage,
                  onLimitChange: supplierList.setLimit,
                  disabled: supplierList.loading,
                }}
                columns={creditColumns("supplier", reloadAll)}
              />
            )}
          </TabsContent>
        </Tabs>
      </PermissionGate>
    </AppShell>
  );
}

function OpeningCreditDialog({
  type,
  onSuccess,
}: {
  type: "customer" | "supplier";
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [partyId, setPartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: parties, loading: partiesLoading } = useFetch(
    () => (type === "customer" ? fetchCustomers() : fetchSuppliers()),
    [type]
  );

  const partyOptions = (parties ?? []).map((p) => ({
    value: p.id,
    label: p.phone ? `${p.name} · ${p.phone}` : p.name,
  }));

  function resetForm() {
    setPartyId("");
    setAmount("");
    setDueDate("");
    setReference("");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    setSaving(true);
    try {
      const path =
        type === "customer" ? "/credits/customers" : "/credits/suppliers";
      await api(path, {
        method: "POST",
        body: {
          [type === "customer" ? "customerId" : "supplierId"]: partyId,
          amount: parsedAmount,
          dueDate: dueDate || undefined,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      toast.success(
        type === "customer"
          ? "Opening receivable added"
          : "Opening payable added"
      );
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const label = type === "customer" ? "customer" : "supplier";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon />
          Opening {type === "customer" ? "receivable" : "payable"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              New opening {type === "customer" ? "receivable" : "payable"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-[var(--frappe-text-muted)]">
              Carry over an unpaid invoice from a previous system. Creating it
              does not move cash. When you later click Pay, you choose a
              bank/cash account — customer receipts increase it, supplier
              payments deduct from it (same as other credits).
            </p>
            <div className="grid gap-2">
              <Label>
                {type === "customer" ? "Customer" : "Supplier"}{" "}
                <span className="text-[var(--frappe-red)]">*</span>
              </Label>
              <SearchSelect
                value={partyId}
                onValueChange={setPartyId}
                options={partyOptions}
                placeholder={`Select ${label}…`}
                searchPlaceholder={`Search ${label}…`}
                emptyMessage={`No ${label}s found.`}
                loading={partiesLoading}
                disabled={partiesLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label>
                Amount <span className="text-[var(--frappe-red)]">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="12500"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Reference</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Prior-system invoice number"
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional context for this balance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !partyId}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VoidPaymentsButton({
  type,
  credit,
  onSuccess,
}: {
  type: "customer" | "supplier";
  credit: CreditRecord;
  onSuccess: () => void;
}) {
  const [voiding, setVoiding] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleVoid() {
    setVoiding(true);
    try {
      const path =
        type === "customer"
          ? `/credits/customers/${credit.id}/payments`
          : `/credits/suppliers/${credit.id}/payments`;
      await api(path, { method: "DELETE" });
      toast.success("Payments voided");
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setVoiding(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={voiding}
          aria-label="Void payments"
          title="Void payments"
        >
          <RotateCcwIcon className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void payments?</AlertDialogTitle>
          <AlertDialogDescription>
            {type === "customer"
              ? "Bank receipts for this receivable will be reversed and the balance reopened."
              : "Bank deductions for this payable will be reversed and the balance reopened."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={voiding}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={voiding}
            onClick={(e) => {
              e.preventDefault();
              void handleVoid();
            }}
          >
            {voiding ? "Voiding…" : "Void payments"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteOpeningCreditButton({
  type,
  credit,
  onSuccess,
}: {
  type: "customer" | "supplier";
  credit: CreditRecord;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const hasPayments = parseFloat(credit.paidAmount) > 0;

  async function handleDelete() {
    if (hasPayments) {
      toast.error("Void payments first, then delete this opening credit.");
      setOpen(false);
      return;
    }
    setDeleting(true);
    try {
      const path =
        type === "customer"
          ? `/credits/customers/${credit.id}`
          : `/credits/suppliers/${credit.id}`;
      await api(path, { method: "DELETE" });
      toast.success("Opening credit deleted");
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 text-destructive"
          disabled={deleting || hasPayments}
          aria-label="Delete opening credit"
          title={
            hasPayments
              ? "Void payments before deleting"
              : "Delete opening credit"
          }
        >
          <Trash2Icon className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete opening credit?</AlertDialogTitle>
          <AlertDialogDescription>
            Only unpaid opening balances can be removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
