"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import { FrappeFilterBar, FrappeListToolbar } from "@/components/frappe";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import { FilterSelect } from "@/components/shared/filter-field";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import { QuickExpenseCategoryDialog } from "@/components/expenses/quick-expense-category-dialog";
import { QuickBankAccountDialog } from "@/components/banks/quick-bank-account-dialog";
import { FrappeButtonPrimary } from "@/components/frappe";
import { Button } from "@/components/ui/button";
import {
  AppDialogBody,
  AppDialogContent,
  AppDialogFooter,
  AppDialogHeader,
} from "@/components/shared/app-dialog-shell";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import { buildExpensesListPath } from "@/lib/list-query";
import {
  bankAccountSelectOptions,
  bankAccountsForSelect,
  formatBankAccountLabel,
} from "@/lib/bank-accounts";
import { formatMoney, formatDate, errorMessage } from "@/lib/format";
import type { BankAccount, Expense, ExpenseCategory, ExpenseListTotals } from "@/lib/types";
import { ListPageTotals } from "@/components/shared/list-page-totals";
import { ListRowActions } from "@/components/shared/list-row-actions";
import { useFetch } from "@/hooks/use-fetch";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: categories } = useFetch(
    () => api<ExpenseCategory[]>("/expenses/categories"),
    []
  );
  const { data: banks } = useFetch(
    () => apiList<BankAccount>("/banks/accounts"),
    []
  );
  const { rows, meta, totals, setPage, setLimit, loading, reload } =
    usePaginatedList<Expense, ExpenseListTotals>(
      (page, limit) =>
        buildExpensesListPath(
          {
            from: from || undefined,
            to: to || undefined,
            search: debouncedSearch || undefined,
            categoryId: categoryId || undefined,
            bankAccountId: bankAccountId || undefined,
          },
          page,
          limit
        ),
      [from, to, debouncedSearch, categoryId, bankAccountId]
    );

  return (
    <AppShell
      title="Expenses"
      actions={
        <PermissionGate permission="expense.write">
          <ExpenseDialog onSuccess={reload} />
        </PermissionGate>
      }
    >
      <PermissionGate permission="expense.read" showDenied>
        <FrappeFilterBar
          search={
            <ListSearchField
              variant="toolbar"
              value={search}
              onChange={setSearch}
              placeholder="Search expenses..."
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
            categoryId
              ? {
                  id: "category",
                  label:
                    categories?.find((c) => c.id === categoryId)?.name ??
                    "Category",
                  onRemove: () => setCategoryId(""),
                }
              : null,
            bankAccountId
              ? {
                  id: "account",
                  label:
                    banks?.find((b) => b.id === bankAccountId)?.name ??
                    "Account",
                  onRemove: () => setBankAccountId(""),
                }
              : null,
          ].filter(Boolean) as { id: string; label: string; onRemove: () => void }[]}
          onClearAll={() => {
            setFrom("");
            setTo("");
            setCategoryId("");
            setBankAccountId("");
          }}
        >
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          <FilterSelect
            label="Category"
            value={categoryId}
            onValueChange={setCategoryId}
            allLabel="All categories"
            options={(categories ?? []).map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
          <FilterSelect
            label="Account"
            value={bankAccountId}
            onValueChange={setBankAccountId}
            allLabel="All accounts"
            options={bankAccountsForSelect(banks ?? []).map((b) => ({
              value: b.id,
              label: formatBankAccountLabel(b),
            }))}
          />
        </FrappeFilterBar>
        <FrappeListToolbar>
          <span className="text-[var(--frappe-text-muted)]">
            {meta.total} expense{meta.total === 1 ? "" : "s"}
          </span>
          {totals ? (
            <ListPageTotals
              items={[
                { label: "Total amount", value: formatMoney(totals.amount) },
              ]}
            />
          ) : null}
        </FrappeListToolbar>
        {loading ? (
          <PageLoading />
        ) : (
          <DataCardTable
            rows={rows}
            emptyTitle="No expenses"
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
                cell: (r) => formatDate(r.expenseDate),
              },
              {
                key: "category",
                header: "Category",
                primary: true,
                cell: (r) => r.category?.name ?? "—",
              },
              {
                key: "desc",
                header: "Description",
                cell: (r) => r.description ?? "—",
              },
              {
                key: "amount",
                header: "Amount",
                secondary: true,
                className: "text-right tabular-nums",
                cell: (r) => formatMoney(r.amount),
              },
              {
                key: "actions",
                header: "",
                className: "w-12 text-right",
                cell: (r) => (
                  <ExpenseRowActions id={r.id} onSuccess={reload} />
                ),
              },
            ]}
          />
        )}
      </PermissionGate>
    </AppShell>
  );
}

function ExpenseRowActions({
  id,
  onSuccess,
}: {
  id: string;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this expense? Bank balance may be adjusted.")) return;
    setDeleting(true);
    try {
      await api(`/expenses/${id}`, { method: "DELETE" });
      toast.success("Expense deleted");
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ListRowActions
      items={[
        {
          label: "Delete",
          icon: Trash2Icon,
          destructive: true,
          disabled: deleting,
          onSelect: () => void handleDelete(),
          hidden: !hasPermission(user, "expense.write"),
        },
      ]}
    />
  );
}

function ExpenseDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);

  const {
    data: categories,
    reload: reloadCategories,
    setData: setCategories,
  } = useFetch(() => api<ExpenseCategory[]>("/expenses/categories"), []);
  const {
    data: banks,
    reload: reloadBanks,
    setData: setBanks,
  } = useFetch(() => apiList<BankAccount>("/banks/accounts"), []);

  function onCategoryCreated(category: ExpenseCategory) {
    setCategories((prev) => [...(prev ?? []), category]);
    setCategoryId(category.id);
    reloadCategories();
  }

  function onBankCreated(account: BankAccount) {
    setBanks((prev) => [...(prev ?? []), account]);
    setBankAccountId(account.id);
    reloadBanks();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/expenses", {
        method: "POST",
        body: {
          categoryId,
          bankAccountId,
          amount: parseFloat(amount),
          description,
          expenseDate,
        },
      });
      toast.success("Expense recorded");
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          Add expense
        </Button>
      </DialogTrigger>
      <AppDialogContent size="sm">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <AppDialogHeader title="Record expense" />
          <AppDialogBody className="space-y-4">
            <EntitySelectField
              label="Category"
              required
              value={categoryId}
              onValueChange={setCategoryId}
              options={(categories ?? []).map((c) => ({
                id: c.id,
                label: c.name,
              }))}
              listHref="/expenses"
              listLabel="Manage categories"
              emptyMessage="Create an expense category first."
              quickCreate={
                <QuickExpenseCategoryDialog onCreated={onCategoryCreated} />
              }
            />
            <EntitySelectField
              label="Bank account"
              required
              value={bankAccountId}
              onValueChange={setBankAccountId}
              options={bankAccountSelectOptions(banks ?? [], bankAccountId)}
              listHref="/banks"
              listLabel="All accounts"
              emptyMessage="Create a bank account to pay from."
              quickCreate={
                <QuickBankAccountDialog onCreated={onBankCreated} />
              }
            />
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </AppDialogBody>
          <AppDialogFooter>
            <FrappeButtonPrimary type="submit" disabled={saving}>
              Save
            </FrappeButtonPrimary>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}
