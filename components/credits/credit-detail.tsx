"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  FrappeDocument,
  FrappeFormGrid,
  FrappeButtonLink,
} from "@/components/frappe";
import { PermissionGate } from "@/components/permission-gate";
import { PageLoading } from "@/components/shared/page-loading";
import { CreditPaymentDialog } from "@/components/credits/credit-payment-dialog";
import { CreditPaymentsPanel } from "@/components/credits/credit-payments-panel";
import { api } from "@/lib/api";
import { creditBalance } from "@/lib/document-utils";
import { formatMoney, formatDate, errorMessage } from "@/lib/format";
import type { CreditRecord, CreditStatus } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { RotateCcwIcon, Trash2Icon } from "lucide-react";

function DetailField({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium text-[var(--frappe-text-muted)]">
        {label}
      </p>
      {href ? (
        <Link
          href={href}
          className="text-sm font-medium text-[var(--frappe-primary)] hover:underline"
        >
          {value}
        </Link>
      ) : (
        <p className="text-sm text-[var(--frappe-text)]">{value}</p>
      )}
    </div>
  );
}

function statusBadge(status: CreditStatus) {
  const variant =
    status === "PAID"
      ? "secondary"
      : status === "PARTIAL"
        ? "outline"
        : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}

function sourceLabel(type: "customer" | "supplier", credit: CreditRecord) {
  if (credit.source === "OPENING") return "Opening";
  if (type === "supplier" || credit.source === "PURCHASE") return "Purchase";
  return "Sale";
}

export function CreditDetail({
  type,
  creditId,
}: {
  type: "customer" | "supplier";
  creditId: string;
}) {
  const router = useRouter();
  const base =
    type === "customer" ? "/credits/customers" : "/credits/suppliers";

  const {
    data: credit,
    loading,
    error,
    reload,
  } = useFetch(
    () =>
      creditId
        ? api<CreditRecord>(`${base}/${creditId}`)
        : Promise.reject(new Error("Invalid credit id")),
    [creditId, base]
  );

  if (loading) return <PageLoading />;
  if (error || !credit) {
    return (
      <div className="mx-auto max-w-lg rounded border border-[var(--frappe-border)] bg-[var(--frappe-surface)] p-6 text-center">
        <p className="font-medium text-[var(--frappe-text)]">Credit not found</p>
        <p className="mt-1 text-sm text-[var(--frappe-text-muted)]">
          {error ?? "This record may have been removed."}
        </p>
        <FrappeButtonLink href="/credits" className="mt-4">
          Back to credits
        </FrappeButtonLink>
      </div>
    );
  }

  const party = type === "customer" ? credit.customer : credit.supplier;
  const doc = type === "customer" ? credit.sale : credit.purchase;
  const docHref =
    type === "customer"
      ? credit.saleId
        ? `/sales/${credit.saleId}`
        : null
      : credit.purchaseId
        ? `/purchases/${credit.purchaseId}`
        : null;
  const outstanding = creditBalance(credit);
  const canPay = credit.status !== "PAID" && parseFloat(outstanding) > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FrappeButtonLink href="/credits">← Back to list</FrappeButtonLink>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {statusBadge(credit.status)}
          <Badge variant={credit.source === "OPENING" ? "secondary" : "outline"}>
            {sourceLabel(type, credit)}
          </Badge>
          {canPay ? (
            <PermissionGate permission="credit.write">
              <CreditPaymentDialog
                type={type}
                credit={credit}
                onSuccess={() => void reload()}
              />
            </PermissionGate>
          ) : null}
          {parseFloat(credit.paidAmount) > 0 ? (
            <PermissionGate permission="credit.write">
              <VoidAllPaymentsButton
                type={type}
                credit={credit}
                onSuccess={() => void reload()}
              />
            </PermissionGate>
          ) : null}
          {credit.source === "OPENING" ? (
            <PermissionGate permission="credit.write">
              <DeleteOpeningButton
                type={type}
                credit={credit}
                onSuccess={() => router.push("/credits")}
              />
            </PermissionGate>
          ) : null}
        </div>
      </div>

      <FrappeDocument>
        <section className="border-b border-[var(--frappe-border)]">
          <div className="frappe-section-head border-b border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-2.5">
            <h3 className="text-sm font-semibold text-[var(--frappe-text)]">
              {type === "customer" ? "Customer receivable" : "Supplier payable"}
            </h3>
            {credit.createdAt ? (
              <p className="mt-0.5 text-xs text-[var(--frappe-text-muted)]">
                Created {formatDate(credit.createdAt)}
              </p>
            ) : null}
          </div>
          <div className="p-4">
            <FrappeFormGrid columns={2}>
              <DetailField
                label={type === "customer" ? "Customer" : "Supplier"}
                value={party?.name ?? "—"}
              />
              <DetailField
                label="Source"
                value={sourceLabel(type, credit)}
                href={docHref ?? undefined}
              />
              {credit.reference ? (
                <DetailField label="Reference" value={credit.reference} />
              ) : null}
              <DetailField label="Due date" value={formatDate(credit.dueDate)} />
              <DetailField label="Amount" value={formatMoney(credit.amount)} />
              <DetailField
                label="Paid"
                value={formatMoney(credit.paidAmount)}
              />
              <DetailField
                label="Balance"
                value={formatMoney(outstanding)}
              />
              {docHref && doc?.createdAt ? (
                <DetailField
                  label={type === "customer" ? "Sale date" : "Purchase date"}
                  value={formatDate(doc.createdAt)}
                  href={docHref}
                />
              ) : null}
              {credit.notes ? (
                <div className="sm:col-span-2">
                  <DetailField label="Notes" value={credit.notes} />
                </div>
              ) : null}
            </FrappeFormGrid>
          </div>
        </section>

        <CreditPaymentsPanel
          type={type}
          credit={credit}
          onCreditChange={() => void reload()}
          showHeaderActions={false}
        />
      </FrappeDocument>
    </div>
  );
}

function VoidAllPaymentsButton({
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
      toast.success("All payments voided");
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
        <Button type="button" size="sm" variant="outline" disabled={voiding}>
          <RotateCcwIcon className="mr-1.5 size-3.5" />
          Void all
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void all payments?</AlertDialogTitle>
          <AlertDialogDescription>
            {type === "customer"
              ? "Every bank receipt for this receivable will be reversed and the full balance reopened."
              : "Every bank deduction for this payable will be reversed and the full balance reopened."}
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
            {voiding ? "Voiding…" : "Void all payments"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteOpeningButton({
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
          size="sm"
          variant="outline"
          className="text-destructive"
          disabled={deleting || hasPayments}
          title={
            hasPayments
              ? "Void payments before deleting"
              : "Delete opening credit"
          }
        >
          <Trash2Icon className="mr-1.5 size-3.5" />
          Delete
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
