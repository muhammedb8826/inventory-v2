"use client";

import { AppShell } from "@/components/app-shell";
import { InquiryForm } from "@/components/inquiries/inquiry-form";
import { PermissionGate } from "@/components/permission-gate";

export default function NewInquiryPage() {
  return (
    <AppShell
      title="New Quotation"
      subtitle="Not Saved"
      variant="form"
      breadcrumbs={[
        { label: "Qenenia ERP", href: "/dashboard" },
        { label: "Quotations", href: "/inquiries" },
        { label: "New" },
      ]}
    >
      <PermissionGate
        permission="inquiries.write"
        fallback={
          <p className="text-sm text-[var(--frappe-text-muted)]">
            You do not have permission to create quotations.
          </p>
        }
      >
        <InquiryForm />
      </PermissionGate>
    </AppShell>
  );
}
