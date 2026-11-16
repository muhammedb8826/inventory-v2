"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { PageLoading } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchAttributes } from "@/lib/attributes";
import type { ProductAttribute, ProductAttributeValue } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";
import { PlusIcon, SearchIcon, TagsIcon } from "lucide-react";

export default function AttributesSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = hasPermission(user, "attributes.write");
  const { data, loading } = useFetch(() => fetchAttributes(true), []);
  const attributes = data ?? [];
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attributes;
    return attributes.filter((attr) => {
      if (
        attr.name.toLowerCase().includes(q) ||
        attr.code.toLowerCase().includes(q)
      ) {
        return true;
      }
      return (attr.values ?? []).some(
        (v) =>
          v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q)
      );
    });
  }, [attributes, query]);

  return (
    <AppShell
      title="Attributes"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Attributes" },
      ]}
      actions={
        canWrite ? (
          <Button type="button" size="sm" asChild>
            <Link href="/settings/attributes/new">
              <PlusIcon className="mr-1.5 size-3.5" />
              Create
            </Link>
          </Button>
        ) : null
      }
    >
      <PermissionGate permission="attributes.read" showDenied>
        {loading && !data ? (
          <PageLoading />
        ) : attributes.length === 0 ? (
          <div className="mx-auto max-w-lg rounded border border-[var(--erp-border)] bg-[var(--erp-surface)] px-6 py-14 text-center">
            <TagsIcon className="mx-auto size-10 text-[var(--erp-text-muted)]" />
            <h2 className="mt-4 text-lg font-semibold text-[var(--erp-text)]">
              No attributes yet
            </h2>
            <p className="mt-2 text-sm text-[var(--erp-text-muted)]">
              Create attributes like Color or Size, then add values (Red, XL,
              2XL…).
            </p>
            {canWrite ? (
              <div className="mt-6 flex justify-center">
                <Button type="button" asChild>
                  <Link href="/settings/attributes/new">
                    <PlusIcon className="mr-1.5 size-3.5" />
                    Create
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto max-w-5xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--erp-text-muted)]">
                Open an attribute to manage values (color, size, XL…).
              </p>
              <div className="relative w-full max-w-xs">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--erp-text-muted)]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-8 pr-3 pl-9 text-sm"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded border border-[var(--erp-border)] bg-[var(--erp-surface)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--erp-border)] bg-[var(--erp-section-head)] text-left text-xs font-medium text-[var(--erp-text-muted)]">
                      <th className="px-4 py-2.5 font-medium">Attribute</th>
                      <th className="px-4 py-2.5 font-medium">Values</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-10 text-center text-sm text-[var(--erp-text-muted)]"
                        >
                          No attributes match “{query}”.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((attr) => (
                        <AttributeRow
                          key={attr.id}
                          attribute={attr}
                          onOpen={() =>
                            router.push(`/settings/attributes/${attr.id}`)
                          }
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end border-t border-[var(--erp-border)] bg-[var(--erp-section-head)]/50 px-4 py-1.5 text-xs text-[var(--erp-text-muted)]">
                {filtered.length} / {attributes.length}
              </div>
            </div>
          </div>
        )}
      </PermissionGate>
    </AppShell>
  );
}

function AttributeRow({
  attribute,
  onOpen,
}: {
  attribute: ProductAttribute;
  onOpen: () => void;
}) {
  const values = [...(attribute.values ?? [])].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)
  );
  return (
    <tr
      className={cn(
        "cursor-pointer border-b border-[var(--erp-border)] last:border-b-0 hover:bg-[var(--erp-section-head)]/60",
        !attribute.isActive && "opacity-55"
      )}
      onClick={onOpen}
    >
      <td className="align-middle px-4 py-3.5">
        <span className="text-sm text-[var(--erp-text)] hover:text-[var(--erp-accent)] hover:underline">
          {attribute.name}
        </span>
        {!attribute.isActive ? (
          <span className="ml-2 text-[11px] text-[var(--erp-text-muted)]">
            Inactive
          </span>
        ) : null}
      </td>
      <td className="align-middle px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {values.length === 0 ? (
            <span className="text-xs text-[var(--erp-text-muted)]">
              No values
            </span>
          ) : (
            values.map((v) => <ValuePill key={v.id} value={v} />)
          )}
        </div>
      </td>
    </tr>
  );
}

function ValuePill({ value }: { value: ProductAttributeValue }) {
  const hex = value.colorHex?.trim();
  return (
    <span
      title={value.code}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-[var(--erp-border)] bg-[var(--erp-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--erp-text)]",
        !value.isActive && "opacity-50 line-through"
      )}
    >
      {hex ? (
        <span
          className="size-2.5 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: hex }}
        />
      ) : null}
      {value.name}
    </span>
  );
}
