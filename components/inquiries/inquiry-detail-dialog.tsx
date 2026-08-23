"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FrappeButtonPrimary } from "@/components/frappe";
import { InquiryFormFields } from "@/components/inquiries/inquiry-form-fields";
import {
  InquiryFormDialogBody,
  InquiryFormDialogContent,
  InquiryFormDialogFooter,
  InquiryFormDialogHeader,
} from "@/components/inquiries/inquiry-form-dialog-shell";
import {
  InquiryPriorityBadge,
  InquirySourceBadge,
  InquiryStatusBadge,
} from "@/components/inquiries/inquiry-status-badge";
import { PermissionGate } from "@/components/permission-gate";
import { PageLoading } from "@/components/shared/page-loading";
import { useInquiryFormOptions } from "@/hooks/use-inquiry-form-options";
import { api } from "@/lib/api";
import {
  buildUpdateInquiryBody,
  inquiryToFormValues,
  validateInquiryContact,
  type InquiryFormValues,
} from "@/lib/inquiries";
import { errorMessage, formatDate } from "@/lib/format";
import type { Inquiry } from "@/lib/types";
import { toast } from "sonner";

export function InquiryDetailDialog({
  inquiryId,
  open,
  onOpenChange,
  onChanged,
}: {
  inquiryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [values, setValues] = useState<InquiryFormValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const {
    customerOptions,
    userOptions,
    itemOptions,
    reloadCustomers,
    setCustomers,
  } = useInquiryFormOptions();

  useEffect(() => {
    if (!open || !inquiryId) {
      setInquiry(null);
      setValues(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    api<Inquiry>(`/inquiries/${inquiryId}`)
      .then((row) => {
        if (cancelled) return;
        setInquiry(row);
        setValues(inquiryToFormValues(row));
      })
      .catch((err) => {
        if (!cancelled) toast.error(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, inquiryId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!inquiryId || !values) return;

    const contactError = validateInquiryContact(values);
    if (contactError) {
      toast.error(contactError);
      return;
    }

    setSaving(true);
    try {
      const updated = await api<Inquiry>(`/inquiries/${inquiryId}`, {
        method: "PATCH",
        body: buildUpdateInquiryBody(values),
      });
      setInquiry(updated);
      setValues(inquiryToFormValues(updated));
      toast.success("Inquiry updated");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!inquiryId || !inquiry) return;
    if (inquiry.status === "CONVERTED") {
      toast.error(
        "Converted inquiries cannot be cancelled — close them instead"
      );
      return;
    }
    if (!confirm("Cancel this inquiry?")) return;

    setCancelling(true);
    try {
      await api(`/inquiries/${inquiryId}`, { method: "DELETE" });
      toast.success("Inquiry cancelled");
      onOpenChange(false);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <InquiryFormDialogContent>
        <InquiryFormDialogHeader title="Inquiry">
          {inquiry ? (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <InquiryStatusBadge status={inquiry.status} />
              <InquiryPriorityBadge priority={inquiry.priority} />
              <InquirySourceBadge source={inquiry.source} />
              <span className="text-xs text-[var(--frappe-text-muted)]">
                {formatDate(inquiry.createdAt)}
              </span>
            </div>
          ) : null}
        </InquiryFormDialogHeader>

        {loading || !values ? (
          <div className="p-10">
            <PageLoading />
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <InquiryFormDialogBody>
              <InquiryFormFields
                mode="edit"
                idPrefix="inquiry-edit"
                values={values}
                onChange={(patch) =>
                  setValues((prev) => (prev ? { ...prev, ...patch } : prev))
                }
                customerOptions={customerOptions}
                userOptions={userOptions}
                itemOptions={itemOptions}
                onCustomerCreated={(customer) => {
                  setCustomers((prev) => [...(prev ?? []), customer]);
                  setValues((prev) =>
                    prev ? { ...prev, customerId: customer.id } : prev
                  );
                  reloadCustomers();
                }}
              />
            </InquiryFormDialogBody>

            <PermissionGate permission="inquiries.write">
              <InquiryFormDialogFooter>
                {inquiry &&
                inquiry.status !== "CANCELLED" &&
                inquiry.status !== "CONVERTED" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="mr-auto h-8 text-xs"
                    disabled={cancelling}
                    onClick={() => void handleCancel()}
                  >
                    {cancelling ? "Cancelling…" : "Cancel inquiry"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <FrappeButtonPrimary type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </FrappeButtonPrimary>
              </InquiryFormDialogFooter>
            </PermissionGate>
          </form>
        )}
      </InquiryFormDialogContent>
    </Dialog>
  );
}
