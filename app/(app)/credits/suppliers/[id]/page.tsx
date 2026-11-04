"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CreditDetail } from "@/components/credits/credit-detail";
import { PermissionGate } from "@/components/permission-gate";

export default function SupplierCreditDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  return (
    <AppShell
      title="Supplier payable"
      variant="form"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Credits", href: "/credits" },
        { label: id ? id.slice(0, 8) : "…" },
      ]}
    >
      <PermissionGate permission="credit.read" showDenied>
        <CreditDetail type="supplier" creditId={id} />
      </PermissionGate>
    </AppShell>
  );
}
