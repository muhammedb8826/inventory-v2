"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FrappeButtonLink,
  FrappeButtonPrimary,
  FrappeFormToolbar,
} from "@/components/frappe";
import { InquiryFormFields } from "@/components/inquiries/inquiry-form-fields";
import { InquiryStatusStepper } from "@/components/inquiries/inquiry-status-stepper";
import { PageLoading } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import { useInquiryFormOptions } from "@/hooks/use-inquiry-form-options";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  EMPTY_INQUIRY_FORM,
  buildCreateInquiryBody,
  buildUpdateInquiryBody,
  contactPatchFromCustomer,
  inquiryToFormValues,
  validateInquiryContact,
  validateInquiryQuote,
  type InquiryFormValues,
} from "@/lib/inquiries";
import { errorMessage, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import type { Inquiry, InquiryStatus } from "@/lib/types";
import { toast } from "sonner";

export function InquiryForm({ inquiryId }: { inquiryId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const isEdit = Boolean(inquiryId);

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [values, setValues] = useState<InquiryFormValues>(EMPTY_INQUIRY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const {
    customers,
    customerOptions,
    itemOptions,
    reloadCustomers,
    setCustomers,
  } = useInquiryFormOptions();

  const canWrite = hasPermission(user, "inquiries.write");
  const statusLocked =
    values.status === "ORDERED" || values.status === "CANCELLED";

  const canConvert =
    isEdit &&
    values.status !== "CANCELLED" &&
    values.status !== "ORDERED" &&
    values.status !== "LOST" &&
    !values.convertedSaleId.trim();

  const ownerName =
    inquiry?.createdBy?.fullName ||
    inquiry?.createdBy?.email ||
    user?.fullName ||
    user?.email ||
    null;

  useEffect(() => {
    if (!inquiryId) {
      setInquiry(null);
      setValues(EMPTY_INQUIRY_FORM);
      setLoading(false);
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
  }, [inquiryId]);

  function setStatus(next: InquiryStatus) {
    if (statusLocked || !canWrite) return;
    // Ordered = convert to sale (same as Odoo Confirm) — keep the pipeline consistent
    if (next === "ORDERED") {
      if (!inquiryId) {
        toast.error("Save the quotation first, then click Ordered");
        return;
      }
      if (values.status !== "QUOTED") {
        toast.error("Move to Quotation first, then Ordered");
        return;
      }
      router.push(`/sales/new?inquiryId=${inquiryId}`);
      return;
    }
    setValues((prev) => ({ ...prev, status: next }));
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canWrite) return;

    const contactError = validateInquiryContact(values);
    if (contactError) {
      toast.error(contactError);
      return;
    }
    const quoteError = validateInquiryQuote(values);
    if (quoteError) {
      toast.error(quoteError);
      return;
    }

    setSaving(true);
    try {
      if (isEdit && inquiryId) {
        const updated = await api<Inquiry>(`/inquiries/${inquiryId}`, {
          method: "PATCH",
          body: buildUpdateInquiryBody(values),
        });
        setInquiry(updated);
        setValues(inquiryToFormValues(updated));
        toast.success(
          updated.status === "QUOTED" ? "Quotation saved" : "Saved"
        );
      } else {
        const created = await api<Inquiry>("/inquiries", {
          method: "POST",
          body: buildCreateInquiryBody(values),
        });
        toast.success("Quotation created");
        router.replace(`/inquiries/${created.id}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!inquiryId || !inquiry) return;
    if (inquiry.status === "ORDERED") {
      toast.error(
        "Ordered quotations cannot be cancelled — mark Lost if the deal is off"
      );
      return;
    }
    if (!confirm("Cancel this quotation?")) return;
    setCancelling(true);
    try {
      await api(`/inquiries/${inquiryId}`, { method: "DELETE" });
      toast.success("Quotation cancelled");
      router.push("/inquiries");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <form
      onSubmit={(e) => void handleSave(e)}
      className="mx-auto max-w-5xl space-y-0"
    >
      <FrappeFormToolbar>
        {canWrite ? (
          <FrappeButtonPrimary type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save" : "Create"}
          </FrappeButtonPrimary>
        ) : null}
        <FrappeButtonLink href="/inquiries">
          {isEdit ? "Back" : "Discard"}
        </FrappeButtonLink>
        {values.convertedSaleId.trim() ? (
          <Button asChild variant="outline" className="h-8 text-xs">
            <Link href={`/sales/${values.convertedSaleId.trim()}`}>
              Open sale
            </Link>
          </Button>
        ) : null}
        {isEdit &&
        canWrite &&
        inquiry &&
        inquiry.status !== "CANCELLED" &&
        inquiry.status !== "ORDERED" ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 text-xs text-destructive"
            disabled={cancelling}
            onClick={() => void handleCancel()}
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </Button>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <InquiryStatusStepper
            status={values.status}
            onChange={canWrite && !statusLocked ? setStatus : undefined}
            canOrder={Boolean(canConvert && inquiryId)}
            disabled={statusLocked || !canWrite}
          />
          {(ownerName || inquiry) && (
            <span className="hidden text-xs text-[var(--frappe-text-muted)] lg:inline">
              {[ownerName, inquiry ? formatDate(inquiry.createdAt) : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </div>
      </FrappeFormToolbar>

      <InquiryFormFields
        mode={isEdit ? "edit" : "create"}
        idPrefix={isEdit ? "inquiry-edit" : "inquiry-new"}
        values={values}
        onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
        customers={customers}
        customerOptions={customerOptions}
        itemOptions={itemOptions}
        onCustomerCreated={(customer) => {
          setCustomers((prev) => [...(prev ?? []), customer]);
          setValues((prev) => ({
            ...prev,
            customerId: customer.id,
            ...contactPatchFromCustomer(customer),
          }));
          reloadCustomers();
        }}
      />
    </form>
  );
}
