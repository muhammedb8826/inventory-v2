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
import { fetchUomCategories } from "@/lib/uom";
import type { Uom, UomCategory } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";
import { PlusIcon, RulerIcon, SearchIcon } from "lucide-react";

export default function UomSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = hasPermission(user, "uom.write");
  const { data, loading } = useFetch(() => fetchUomCategories(true), []);
  const categories = data ?? [];
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) => {
      if (
        cat.name.toLowerCase().includes(q) ||
        cat.code.toLowerCase().includes(q)
      ) {
        return true;
      }
      return (cat.uoms ?? []).some(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.symbol.toLowerCase().includes(q) ||
          u.code.toLowerCase().includes(q)
      );
    });
  }, [categories, query]);

  return (
    <AppShell
      title="Units of Measure Categories"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Units of measure" },
      ]}
      actions={
        canWrite ? (
          <Button type="button" size="sm" asChild>
            <Link href="/settings/uom/new">
              <PlusIcon className="mr-1.5 size-3.5" />
              Create
            </Link>
          </Button>
        ) : null
      }
    >
      <PermissionGate permission="uom.read" showDenied>
        {loading && !data ? (
          <PageLoading />
        ) : categories.length === 0 ? (
          <div className="mx-auto max-w-lg rounded border border-[var(--erp-border)] bg-[var(--erp-surface)] px-6 py-14 text-center">
            <RulerIcon className="mx-auto size-10 text-[var(--erp-text-muted)]" />
            <h2 className="mt-4 text-lg font-semibold text-[var(--erp-text)]">
              No unit categories yet
            </h2>
            <p className="mt-2 text-sm text-[var(--erp-text-muted)]">
              Create a category, then add units with conversion ratios.
            </p>
            {canWrite ? (
              <div className="mt-6 flex justify-center">
                <Button type="button" asChild>
                  <Link href="/settings/uom/new">
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
                Base unit is highlighted. Open a category to manage units.
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
                      <th className="px-4 py-2.5 font-medium">
                        Unit of Measure Category
                      </th>
                      <th className="px-4 py-2.5 font-medium">Uom</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-10 text-center text-sm text-[var(--erp-text-muted)]"
                        >
                          No categories match “{query}”.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((cat) => (
                        <CategoryRow
                          key={cat.id}
                          category={cat}
                          onOpen={() => router.push(`/settings/uom/${cat.id}`)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end border-t border-[var(--erp-border)] bg-[var(--erp-section-head)]/50 px-4 py-1.5 text-xs text-[var(--erp-text-muted)]">
                {filtered.length} / {categories.length}
              </div>
            </div>
          </div>
        )}
      </PermissionGate>
    </AppShell>
  );
}

function CategoryRow({
  category,
  onOpen,
}: {
  category: UomCategory;
  onOpen: () => void;
}) {
  const units = sortUnits(category.uoms ?? []);
  return (
    <tr
      className={cn(
        "cursor-pointer border-b border-[var(--erp-border)] last:border-b-0 hover:bg-[var(--erp-section-head)]/60",
        !category.isActive && "opacity-55"
      )}
      onClick={onOpen}
    >
      <td className="align-middle px-4 py-3.5">
        <span className="text-sm text-[var(--erp-text)] hover:text-[var(--erp-accent)] hover:underline">
          {category.name}
        </span>
        {!category.isActive ? (
          <span className="ml-2 text-[11px] text-[var(--erp-text-muted)]">
            Inactive
          </span>
        ) : null}
      </td>
      <td className="align-middle px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {units.length === 0 ? (
            <span className="text-xs text-[var(--erp-text-muted)]">No units</span>
          ) : (
            units.map((u) => <UomPill key={u.id} uom={u} />)
          )}
        </div>
      </td>
    </tr>
  );
}

function sortUnits(list: Uom[]): Uom[] {
  return [...list].sort((a, b) => {
    if (a.isBase && !b.isBase) return -1;
    if (!a.isBase && b.isBase) return 1;
    return parseFloat(a.conversionFactor) - parseFloat(b.conversionFactor);
  });
}

function UomPill({ uom }: { uom: Uom }) {
  const label = uom.name || uom.symbol || uom.code;
  return (
    <span
      title={
        uom.isBase
          ? `${label} (base)`
          : `${label} · factor ${trimFactor(uom.conversionFactor)}`
      }
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-0.5 text-xs font-medium",
        uom.isBase
          ? "border-[var(--erp-accent)] bg-[var(--erp-accent)] text-white"
          : "border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-text)]",
        !uom.isActive && !uom.isBase && "opacity-50 line-through"
      )}
    >
      {label}
    </span>
  );
}

function trimFactor(raw: string): string {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return Number(n.toPrecision(9)).toString();
}
