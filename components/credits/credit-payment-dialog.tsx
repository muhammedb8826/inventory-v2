"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import {
  bankAccountsForSelect,
  formatBankAccountLabel,
} from "@/lib/bank-accounts";
import { creditBalance } from "@/lib/document-utils";
import { formatMoney, formatDate, errorMessage } from "@/lib/format";
import type { BankAccount, CreditRecord } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";

export function CreditPaymentDialog({
  type,
  credit,
  onSuccess,
}: {
  type: "customer" | "supplier";
  credit: CreditRecord;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const outstanding = creditBalance(credit);
  const party =
    type === "customer" ? credit.customer?.name : credit.supplier?.name;
  const { data: banks } = useFetch(
    () => apiList<BankAccount>("/banks/accounts"),
    []
  );

  function handleOpen() {
    setAmount(outstanding);
    setNotes("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const path =
        type === "customer"
          ? `/credits/customers/${credit.id}/payments`
          : `/credits/suppliers/${credit.id}/payments`;
      await api(path, {
        method: "POST",
        body: {
          amount: parseFloat(amount),
          bankAccountId,
          notes: notes.trim() || undefined,
        },
      });
      toast.success("Payment recorded");
      setOpen(false);
      setAmount("");
      setNotes("");
      setBankAccountId("");
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        Pay
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setAmount("");
            setNotes("");
          }
        }}
      >
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {party ? (
                <p className="text-sm text-[var(--frappe-text-muted)]">
                  {type === "customer" ? "Customer" : "Supplier"}:{" "}
                  <span className="font-medium text-[var(--frappe-text)]">
                    {party}
                  </span>
                </p>
              ) : null}
              <p className="text-sm text-[var(--frappe-text-muted)]">
                Outstanding balance:{" "}
                <span className="font-medium tabular-nums text-[var(--frappe-text)]">
                  {formatMoney(outstanding)}
                </span>
                {credit.dueDate ? (
                  <>
                    {" "}
                    · Due {formatDate(credit.dueDate)}
                  </>
                ) : null}
              </p>
              <p className="text-xs text-[var(--frappe-text-muted)]">
                Partial amounts are fine — record each installment separately
                (e.g. three terms = three payments).
              </p>
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max={outstanding}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Bank / cash account</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccountsForSelect(banks ?? [], bankAccountId).map(
                      (b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {formatBankAccountLabel(b)}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--frappe-text-muted)]">
                  {type === "customer"
                    ? "Customer payment increases this account balance."
                    : "Supplier payment deducts from this account balance."}
                  {credit.source === "OPENING"
                    ? " Opening balances use the same bank ledger as sale/purchase credits."
                    : null}
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Term 2 of 3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving || !bankAccountId}>
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
