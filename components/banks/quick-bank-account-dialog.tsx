"use client";

import * as React from "react";
import { useState } from "react";
import { FrappeButtonPrimary, FrappeButtonSecondary } from "@/components/frappe";
import { QuickCreateTrigger } from "@/components/shared/quick-create-trigger";
import {
  QuickCreateDialogShell,
  useQuickCreateDialog,
  bindQuickCreateTrigger,
} from "@/components/shared/quick-create-dialog-shell";
import { BankAccountFormFields } from "@/components/banks/bank-account-form-fields";
import { api } from "@/lib/api";
import {
  buildBankAccountBody,
  emptyBankAccountForm,
} from "@/lib/bank-accounts";
import { errorMessage } from "@/lib/format";
import type { BankAccount, BankAccountType } from "@/lib/types";
import { toast } from "sonner";

export function QuickBankAccountDialog({
  onCreated,
  trigger,
  defaultAccountType = "BANK",
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  onCreated: (account: BankAccount) => void;
  trigger?: React.ReactNode | null;
  defaultAccountType?: BankAccountType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { open, setOpen, onOpenChange } = useQuickCreateDialog({
    open: openProp,
    onOpenChange: onOpenChangeProp,
  });
  const [values, setValues] = useState(() =>
    emptyBankAccountForm(defaultAccountType)
  );
  const [saving, setSaving] = useState(false);

  function openDialog() {
    setValues(emptyBankAccountForm(defaultAccountType));
    setOpen(true);
  }

  // Controlled opens (from select host) skip openDialog — reset form when shown.
  React.useEffect(() => {
    if (open) setValues(emptyBankAccountForm(defaultAccountType));
  }, [open, defaultAccountType]);

  function patchValues(patch: Partial<typeof values>) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit() {
    if (!values.name.trim()) {
      toast.error("Display name is required");
      return;
    }
    setSaving(true);
    try {
      const account = await api<BankAccount>("/banks/accounts", {
        method: "POST",
        body: buildBankAccountBody(values, "create"),
      });
      toast.success("Account created");
      setOpen(false);
      onCreated(account);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const title =
    defaultAccountType === "CASH" ? "New cash till" : "New bank account";

  return (
    <>
      {bindQuickCreateTrigger(
        trigger,
        openDialog,
        <QuickCreateTrigger label="New account" onClick={openDialog} />
      )}
      <QuickCreateDialogShell
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        footer={
          <>
            <FrappeButtonSecondary type="button" onClick={() => setOpen(false)}>
              Cancel
            </FrappeButtonSecondary>
            <FrappeButtonPrimary type="button" disabled={saving} onClick={handleSubmit}>
              Create
            </FrappeButtonPrimary>
          </>
        }
      >
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <BankAccountFormFields
            mode="create"
            values={values}
            onChange={patchValues}
          />
        </div>
      </QuickCreateDialogShell>
    </>
  );
}
