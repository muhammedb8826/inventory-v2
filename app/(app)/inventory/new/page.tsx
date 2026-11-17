"use client";

import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StockForm } from "@/components/inventory/stock-form";
import { PermissionGate } from "@/components/permission-gate";

export default function NewInventoryItemPage() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get("locationId") ?? undefined;

  return (
    <AppShell
      title="New Item"
      subtitle="Not Saved"
      variant="form"
      breadcrumbs={[
        { label: "Qenenia ERP", href: "/dashboard" },
        { label: "Stock Ledger", href: "/inventory" },
        { label: "New" },
      ]}
    >
      <PermissionGate
        permission="inventory.write"
        fallback={
          <p className="text-sm text-[var(--frappe-text-muted)]">
            You do not have permission to create items.
          </p>
        }
      >
        <StockForm defaultLocationId={locationId} />
      </PermissionGate>
    </AppShell>
  );
}
