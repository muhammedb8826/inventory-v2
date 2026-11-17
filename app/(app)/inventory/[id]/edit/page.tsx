"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StockForm } from "@/components/inventory/stock-form";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import { FrappeButtonLink } from "@/components/frappe";
import { api } from "@/lib/api";
import type { StockRecord } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";

export default function EditInventoryItemPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const { data: record, loading, error } = useFetch(
    () =>
      id
        ? api<StockRecord>(`/inventory/${id}`)
        : Promise.reject(new Error("Invalid stock id")),
    [id]
  );

  return (
    <AppShell
      title={
        loading
          ? "Edit Item"
          : `Edit — ${record?.item.description ?? "Item"}`
      }
      subtitle="Update stock item"
      variant="form"
      breadcrumbs={[
        { label: "Qenenia ERP", href: "/dashboard" },
        { label: "Stock Ledger", href: "/inventory" },
        { label: "Edit" },
      ]}
    >
      <PermissionGate
        permission="inventory.write"
        fallback={
          <p className="text-sm text-[var(--frappe-text-muted)]">
            You do not have permission to edit items.
          </p>
        }
      >
        {loading ? (
          <PageLoading />
        ) : error || !record ? (
          <div className="mx-auto max-w-lg rounded border border-[var(--frappe-border)] bg-[var(--frappe-surface)] p-6 text-center">
            <p className="font-medium text-[var(--frappe-text)]">
              Stock item not found
            </p>
            <FrappeButtonLink href="/inventory" className="mt-4">
              Back to stock ledger
            </FrappeButtonLink>
          </div>
        ) : (
          <StockForm record={record} />
        )}
      </PermissionGate>
    </AppShell>
  );
}
