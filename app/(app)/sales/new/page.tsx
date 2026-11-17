"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { SaleForm } from "@/components/sales/sale-form";
import { PermissionGate } from "@/components/permission-gate";
import { Spinner } from "@/components/ui/spinner";

function NewSaleForm() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");

  return <SaleForm inquiryId={inquiryId} />;
}

export default function NewSalePage() {
  return (
    <AppShell
      title="New Sales Invoice"
      subtitle="Not Saved"
      variant="form"
      breadcrumbs={[
        { label: "Qenenia ERP", href: "/dashboard" },
        { label: "Sales Invoice", href: "/sales" },
        { label: "New" },
      ]}
    >
      <PermissionGate
        permission="sales.write"
        fallback={
          <p className="text-sm text-[var(--frappe-text-muted)]">
            You do not have permission to create sales.
          </p>
        }
      >
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spinner className="size-8" />
            </div>
          }
        >
          <NewSaleForm />
        </Suspense>
      </PermissionGate>
    </AppShell>
  );
}
