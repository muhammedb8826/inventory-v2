"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { PageLoading } from "@/components/shared/page-loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { errorMessage } from "@/lib/format";
import {
  createUom,
  deleteUom,
  deleteUomCategory,
  fetchUomCategory,
  updateUom,
  updateUomCategory,
} from "@/lib/uom";
import type { Uom } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Trash2Icon } from "lucide-react";

type DraftLine = {
  key: string;
  id?: string;
  name: string;
  symbol: string;
  code: string;
  isBase: boolean;
  ratio: string;
  isActive: boolean;
  dirty: boolean;
  removed?: boolean;
};

export default function UomCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { user } = useAuth();
  const canWrite = hasPermission(user, "uom.write");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [hasConstantWidth, setHasConstantWidth] = useState(false);
  const [categoryDirty, setCategoryDirty] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cat = await fetchUomCategory(id);
      setName(cat.name);
      setCode(cat.code);
      setDescription(cat.description ?? "");
      setIsActive(cat.isActive ?? true);
      setHasConstantWidth(Boolean(cat.hasConstantWidth));
      setCategoryDirty(false);
      const next = sortUnits(cat.uoms ?? []).map((u) => uomToDraft(u));
      setLines(next);
      setSelectedKey(next[0]?.key ?? null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleLines = useMemo(
    () => lines.filter((l) => !l.removed),
    [lines]
  );

  const baseSymbol = useMemo(
    () => visibleLines.find((l) => l.isBase)?.symbol || "base",
    [visibleLines]
  );

  const dirty =
    categoryDirty || lines.some((l) => l.dirty || (l.removed && l.id));

  function patchLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch, dirty: true } : l))
    );
  }

  function setAsBase(key: string) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key === key) {
          return { ...l, isBase: true, ratio: "1", dirty: true };
        }
        if (l.isBase) {
          return { ...l, isBase: false, dirty: true };
        }
        return l;
      })
    );
  }

  function addLine() {
    if (!canWrite) return;
    const key = `new-${crypto.randomUUID()}`;
    const hasBase = visibleLines.some((l) => l.isBase);
    const line: DraftLine = {
      key,
      name: "",
      symbol: "",
      code: "",
      isBase: !hasBase,
      ratio: "1",
      isActive: true,
      dirty: true,
    };
    setLines((prev) => [...prev, line]);
    setSelectedKey(key);
  }

  function removeLine(key: string) {
    if (!canWrite) return;
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        if (!l.id) return { ...l, removed: true, dirty: true };
        return { ...l, isActive: false, removed: true, dirty: true };
      })
    );
    setSelectedKey((cur) => (cur === key ? null : cur));
  }

  async function handleDelete() {
    if (!canWrite || deleting) return;
    setDeleting(true);
    try {
      await deleteUomCategory(id);
      toast.success("Category deleted");
      router.replace("/settings/uom");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    if (!canWrite || !dirty) return;
    if (!name.trim() || !code.trim()) {
      toast.error("Category name and code are required");
      return;
    }

    const bases = visibleLines.filter((l) => l.isBase);
    if (visibleLines.length > 0 && bases.length !== 1) {
      toast.error("Mark exactly one unit as base");
      return;
    }

    for (const line of visibleLines) {
      if (!line.name.trim()) {
        toast.error("Every unit needs a name");
        setSelectedKey(line.key);
        return;
      }
      const ratio = parseFloat(line.ratio);
      if (!Number.isFinite(ratio) || ratio <= 0) {
        toast.error(`Invalid factor for ${line.name}`);
        setSelectedKey(line.key);
        return;
      }
    }

    setSaving(true);
    try {
      if (categoryDirty) {
        await updateUomCategory(id, {
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || null,
          isActive,
          hasConstantWidth,
        });
      }

      // Save non-base first, then base, so API base-clearing stays consistent
      const toSave = lines.filter(
        (l) => !l.removed && l.dirty
      );
      const ordered = [
        ...toSave.filter((l) => !l.isBase),
        ...toSave.filter((l) => l.isBase),
      ];

      for (const line of lines) {
        if (line.removed && line.id) {
          await deleteUom(line.id);
        }
      }

      for (const line of ordered) {
        const payload = draftToPayload(line, id);
        if (line.id) {
          await updateUom(line.id, payload);
        } else {
          await createUom(payload);
        }
      }

      toast.success("Saved");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title={name || "Category"}
      subtitle="Unit of Measure Category"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Units of measure", href: "/settings/uom" },
        { label: name || "Category" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/settings/uom">Back</Link>
          </Button>
          {canWrite ? (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={deleting}
                  >
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete category?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes {name || "this category"} and its
                      units. Blocked if any unit is used on items or documents.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleDelete()}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting…" : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                type="button"
                size="sm"
                disabled={!dirty || saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      <PermissionGate permission="uom.read" showDenied>
        {loading ? (
          <PageLoading />
        ) : (
          <div className="mx-auto max-w-5xl overflow-hidden rounded border border-[var(--erp-border)] bg-[var(--erp-surface)]">
            <div className="grid gap-3 border-b border-[var(--erp-border)] px-5 py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
              <Label className="text-sm font-normal text-[var(--erp-text)]">
                Unit of Measure Category
              </Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={name}
                  disabled={!canWrite}
                  onChange={(e) => {
                    setName(e.target.value);
                    setCategoryDirty(true);
                  }}
                  className="h-9 max-w-md text-base"
                />
                <div className="flex items-center gap-2 text-sm text-[var(--erp-text-muted)]">
                  <span>Active</span>
                  <Switch
                    checked={isActive}
                    disabled={!canWrite}
                    onCheckedChange={(v) => {
                      setIsActive(v);
                      setCategoryDirty(true);
                    }}
                  />
                </div>
              </div>
              <Label className="text-sm font-normal text-[var(--erp-text-muted)]">
                Code
              </Label>
              <Input
                value={code}
                disabled={!canWrite}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setCategoryDirty(true);
                }}
                className="h-9 max-w-xs font-mono uppercase"
              />
              <Label className="text-sm font-normal text-[var(--erp-text-muted)]">
                Description
              </Label>
              <Input
                value={description}
                disabled={!canWrite}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setCategoryDirty(true);
                }}
                className="h-9 max-w-md"
                placeholder="Optional"
              />
              <Label className="text-sm font-normal text-[var(--erp-text-muted)]">
                Has constant width
              </Label>
              <div className="flex max-w-md items-start gap-3">
                <Switch
                  checked={hasConstantWidth}
                  disabled={!canWrite}
                  onCheckedChange={(v) => {
                    setHasConstantWidth(v);
                    setCategoryDirty(true);
                  }}
                />
                <p className="text-xs text-[var(--erp-text-muted)]">
                  Items in this category can set a constant roll width; document
                  lines may show cut width/height. Off hides width/height
                  everywhere.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--erp-border)] bg-[var(--erp-section-head)] px-5">
              <div className="inline-flex border-b-2 border-[var(--erp-accent)] px-1 py-2.5 text-sm font-medium text-[var(--erp-text)]">
                Units of Measure
              </div>
              <p className="pb-2 text-[11px] text-[var(--erp-text-muted)]">
                Factor = how many <span className="font-medium">{baseSymbol}</span>{" "}
                equal 1 of this unit
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--erp-border)] text-left text-xs font-semibold text-[var(--erp-text)]">
                    <th className="px-4 py-2.5 font-semibold">Unit of Measure</th>
                    <th className="px-3 py-2.5 font-semibold">Symbol</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Base</th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Factor → {baseSymbol}
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold">Active</th>
                    {canWrite ? <th className="w-10 px-2 py-2.5" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibleLines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canWrite ? 6 : 5}
                        className="px-4 py-8 text-center text-sm text-[var(--erp-text-muted)]"
                      >
                        No units yet. Add a line and mark one as base.
                      </td>
                    </tr>
                  ) : (
                    visibleLines.map((line) => {
                      const selected = selectedKey === line.key;
                      return (
                        <tr
                          key={line.key}
                          onClick={() => setSelectedKey(line.key)}
                          className={cn(
                            "border-b border-[var(--erp-border)] last:border-b-0",
                            selected &&
                              "bg-[var(--erp-accent)]/[0.04] outline outline-1 outline-[var(--erp-accent)] -outline-offset-1",
                            line.isBase && "bg-[var(--erp-section-head)]/40"
                          )}
                        >
                          <td className="px-3 py-1.5">
                            <Input
                              value={line.name}
                              disabled={!canWrite}
                              onChange={(e) => {
                                const nextName = e.target.value;
                                const patch: Partial<DraftLine> = {
                                  name: nextName,
                                };
                                if (!line.id) {
                                  if (
                                    !line.symbol ||
                                    line.symbol === slugSymbol(line.name)
                                  ) {
                                    patch.symbol = slugSymbol(nextName);
                                  }
                                  if (
                                    !line.code ||
                                    line.code === slugCode(line.name)
                                  ) {
                                    patch.code = slugCode(nextName);
                                  }
                                }
                                patchLine(line.key, patch);
                              }}
                              className="h-8 border-transparent bg-transparent px-1 shadow-none focus-visible:border-input focus-visible:bg-[var(--erp-surface)]"
                              placeholder="e.g. Dozen"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              value={line.symbol}
                              disabled={!canWrite}
                              onChange={(e) =>
                                patchLine(line.key, {
                                  symbol: e.target.value,
                                })
                              }
                              className="h-8 border-transparent bg-transparent px-1 font-mono text-xs shadow-none focus-visible:border-input focus-visible:bg-[var(--erp-surface)]"
                              placeholder="dz"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              className="size-4 accent-[var(--erp-accent)]"
                              checked={line.isBase}
                              disabled={!canWrite}
                              onChange={(e) => {
                                if (e.target.checked) setAsBase(line.key);
                              }}
                              title="Base unit for this category"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={line.ratio}
                              disabled={!canWrite || line.isBase}
                              onChange={(e) =>
                                patchLine(line.key, { ratio: e.target.value })
                              }
                              className="h-8 border-transparent bg-transparent px-1 text-right font-mono tabular-nums shadow-none focus-visible:border-input focus-visible:bg-[var(--erp-surface)] disabled:opacity-70"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              className="size-4 accent-[var(--erp-accent)]"
                              checked={line.isActive}
                              disabled={!canWrite}
                              onChange={(e) =>
                                patchLine(line.key, {
                                  isActive: e.target.checked,
                                })
                              }
                            />
                          </td>
                          {canWrite ? (
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                className="inline-flex size-7 items-center justify-center rounded text-[var(--erp-text-muted)] hover:bg-red-50 hover:text-red-600"
                                aria-label={`Remove ${line.name || "unit"}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeLine(line.key);
                                }}
                              >
                                <Trash2Icon className="size-3.5" />
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {canWrite ? (
              <div className="border-t border-[var(--erp-border)] px-4 py-2.5">
                <button
                  type="button"
                  onClick={addLine}
                  className="text-sm font-medium text-[var(--erp-accent)] hover:underline"
                >
                  Add a line
                </button>
              </div>
            ) : null}
          </div>
        )}
      </PermissionGate>
    </AppShell>
  );
}

function uomToDraft(u: Uom): DraftLine {
  return {
    key: u.id,
    id: u.id,
    name: u.name,
    symbol: u.symbol,
    code: u.code,
    isBase: Boolean(u.isBase),
    ratio: formatRatio(u.conversionFactor),
    isActive: u.isActive ?? true,
    dirty: false,
  };
}

function draftToPayload(line: DraftLine, categoryId: string) {
  const conversionFactor = line.isBase ? 1 : parseFloat(line.ratio);
  const code =
    line.code.trim() ||
    slugCode(line.name) ||
    `UOM_${Date.now().toString(36).toUpperCase()}`;
  const symbol =
    line.symbol.trim() || slugSymbol(line.name) || code.toLowerCase();
  return {
    categoryId,
    code,
    name: line.name.trim(),
    symbol,
    conversionFactor,
    isBase: line.isBase,
    isActive: line.isActive,
  };
}

function sortUnits(list: Uom[]): Uom[] {
  return [...list].sort((a, b) => {
    if (a.isBase && !b.isBase) return -1;
    if (!a.isBase && b.isBase) return 1;
    return parseFloat(a.conversionFactor) - parseFloat(b.conversionFactor);
  });
}

function formatRatio(raw: string): string {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return Number(n.toPrecision(9)).toString();
}

function slugCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

function slugSymbol(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
}
