"use client";

import { use } from "react";
import { AppShell } from "@/components/app-shell";
import { InquiryForm } from "@/components/inquiries/inquiry-form";
import { PermissionGate } from "@/components/permission-gate";

export default function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <AppShell
      title="Quotation"
      subtitle="Customer quotation"
      variant="form"
      breadcrumbs={[
        { label: "Qenenia ERP", href: "/dashboard" },
        { label: "Quotations", href: "/inquiries" },
        { label: "Detail" },
      ]}
    >
      <PermissionGate
        permission="inquiries.read"
        fallback={
          <p className="text-sm text-[var(--frappe-text-muted)]">
            You do not have permission to view quotations.
          </p>
        }
      >
        <InquiryForm inquiryId={id} />
      </PermissionGate>
    </AppShell>
  );
}
