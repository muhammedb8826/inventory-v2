"use client";

import Link from "next/link";
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
import { FrappeSection } from "@/components/frappe";
import { PermissionGate } from "@/components/permission-gate";
import { CreditPaymentDialog } from "@/components/credits/credit-payment-dialog";
import { api } from "@/lib/api";
import { creditBalance } from "@/lib/document-utils";
import { formatMoney, formatDate, errorMessage } from "@/lib/format";
import type {
  CreditPayment,
  CreditPaymentListResponse,
  CreditRecord,
} from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RotateCcwIcon } from "lucide-react";

/**
 * Installment / remittance list for any credit (opening, sale, or purchase).
 */
export function CreditPaymentsPanel({
  type,
  credit,
  onCreditChange,
  showHeaderActions = true,
  detailHref,
}: {
  type: "customer" | "supplier";
  credit: CreditRecord;
  /** Called after pay / void so the parent can refresh the credit summary. */
  onCreditChange?: () => void;
  showHeaderActions?: boolean;
  /** Optional link to the full credit detail page. */
  detailHref?: string;
}) {
  const base =
    type === "customer" ? "/credits/customers" : "/credits/suppliers";

  const {
    data: paymentsRes,
    loading,
    reload,
  } = useFetch(
    () => api<CreditPaymentListResponse>(`${base}/${credit.id}/payments`),
    [credit.id, base]
  );

  function refresh() {
    void reload();
    onCreditChange?.();
  }

  const payments = paymentsRes?.data ?? [];
  const outstanding = creditBalance(credit);
  const canPay = credit.status !== "PAID" && parseFloat(outstanding) > 0;
  const postedCount = payments.filter((p) => p.status === "POSTED").length;

  return (
    <FrappeSection
      title="Payment schedule"
      description={
        loading
          ? "Loading…"
          : payments.length === 0
            ? "No payments yet — record each installment separately (e.g. 3 terms = 3 payments)."
            : `${postedCount} posted · ${formatMoney(paymentsRes?.totals.paid ?? "0")} ${type === "customer" ? "collected" : "paid"}`
      }
      actions={
        showHeaderActions ? (
          <div className="flex flex-wrap items-center gap-2">
            {detailHref ? (
              <Link
                href={detailHref}
                className="text-xs font-medium text-[var(--frappe-primary)] hover:underline"
              >
                Open credit
              </Link>
            ) : null}
            {canPay ? (
              <PermissionGate permission="credit.write">
                <CreditPaymentDialog
                  type={type}
                  credit={credit}
                  onSuccess={refresh}
                />
              </PermissionGate>
            ) : null}
            {parseFloat(credit.paidAmount) > 0 ? (
              <PermissionGate permission="credit.write">
                <VoidAllPaymentsButton
                  type={type}
                  credit={credit}
                  onSuccess={refresh}
                />
              </PermissionGate>
            ) : null}
          </div>
        ) : null
      }
    >
      <div className="mb-3 grid gap-1 text-sm sm:grid-cols-3">
        <p>
          <span className="text-[var(--frappe-text-muted)]">Amount </span>
          <span className="font-medium tabular-nums">
            {formatMoney(credit.amount)}
          </span>
        </p>
        <p>
          <span className="text-[var(--frappe-text-muted)]">Paid </span>
          <span className="font-medium tabular-nums">
            {formatMoney(credit.paidAmount)}
          </span>
        </p>
        <p>
          <span className="text-[var(--frappe-text-muted)]">Balance </span>
          <span className="font-medium tabular-nums">
            {formatMoney(outstanding)}
          </span>
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--frappe-text-muted)]">
          Loading payments…
        </p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-[var(--frappe-text-muted)]">
          Keep this credit open and post remittances as they happen so the bank
          ledger shows a clear installment history.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="frappe-list-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Date</th>
                <th>Bank account</th>
                <th>Notes</th>
                <th>Status</th>
                <th className="text-right tabular-nums">Amount</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <PaymentRow
                  key={p.id}
                  type={type}
                  creditId={credit.id}
                  payment={p}
                  onSuccess={refresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FrappeSection>
  );
}

function PaymentRow({
  type,
  creditId,
  payment,
  onSuccess,
}: {
  type: "customer" | "supplier";
  creditId: string;
  payment: CreditPayment;
  onSuccess: () => void;
}) {
  const [voiding, setVoiding] = useState(false);
  const [open, setOpen] = useState(false);
  const voided = payment.status === "VOIDED";

  async function handleVoid() {
    setVoiding(true);
    try {
      const path =
        type === "customer"
          ? `/credits/customers/${creditId}/payments/${payment.id}`
          : `/credits/suppliers/${creditId}/payments/${payment.id}`;
      await api(path, { method: "DELETE" });
      toast.success("Payment voided");
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setVoiding(false);
    }
  }

  return (
    <tr className={cn(voided && "opacity-60")}>
      <td className="tabular-nums text-[var(--frappe-text-muted)]">
        {payment.sequence}
      </td>
      <td>{formatDate(payment.createdAt)}</td>
      <td>{payment.bankAccountName ?? "—"}</td>
      <td className="max-w-[14rem] truncate text-[var(--frappe-text-muted)]">
        {payment.notes ?? payment.description ?? "—"}
      </td>
      <td>
        <Badge variant={voided ? "secondary" : "outline"}>
          {payment.status}
        </Badge>
      </td>
      <td className="text-right tabular-nums">{formatMoney(payment.amount)}</td>
      <td>
        {!voided ? (
          <PermissionGate permission="credit.write">
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  disabled={voiding}
                  aria-label="Void payment"
                  title="Void this installment"
                >
                  <RotateCcwIcon className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Void this payment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The bank ledger entry will be reversed and{" "}
                    {formatMoney(payment.amount)} added back to the outstanding
                    balance.
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
                    {voiding ? "Voiding…" : "Void payment"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </PermissionGate>
        ) : null}
      </td>
    </tr>
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
