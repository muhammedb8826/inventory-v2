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
  createAttributeValue,
  deleteAttribute,
  deleteAttributeValue,
  fetchAttribute,
  updateAttribute,
  updateAttributeValue,
} from "@/lib/attributes";
import type { ProductAttributeValue } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Trash2Icon } from "lucide-react";

type DraftLine = {
  key: string;
  id?: string;
  name: string;
  code: string;
  colorHex: string;
  sequence: string;
  isActive: boolean;
  dirty: boolean;
  removed?: boolean;
};

export default function AttributeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { user } = useAuth();
  const canWrite = hasPermission(user, "attributes.write");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [displayType, setDisplayType] = useState("select");
  const [isActive, setIsActive] = useState(true);
  const [attrDirty, setAttrDirty] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const attr = await fetchAttribute(id);
      setName(attr.name);
      setCode(attr.code);
      setDescription(attr.description ?? "");
      setDisplayType(attr.displayType ?? "select");
      setIsActive(attr.isActive ?? true);
      setAttrDirty(false);
      const next = sortValues(attr.values ?? []).map((v) => valueToDraft(v));
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

  const dirty =
    attrDirty || lines.some((l) => l.dirty || (l.removed && l.id));

  const showColor = displayType === "color";

  function patchLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch, dirty: true } : l))
    );
  }

  function addLine() {
    if (!canWrite) return;
    const key = `new-${crypto.randomUUID()}`;
    const maxSeq = visibleLines.reduce(
      (m, l) => Math.max(m, parseInt(l.sequence, 10) || 0),
      0
    );
    const line: DraftLine = {
      key,
      name: "",
      code: "",
      colorHex: "",
      sequence: String(maxSeq + 10),
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
        return { ...l, removed: true, dirty: true };
      })
    );
    setSelectedKey((cur) => (cur === key ? null : cur));
  }

  async function handleDelete() {
    if (!canWrite || deleting) return;
    setDeleting(true);
    try {
      await deleteAttribute(id);
      toast.success("Attribute deleted");
      router.replace("/settings/attributes");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    if (!canWrite || !dirty) return;
    if (!name.trim() || !code.trim()) {
      toast.error("Attribute name and code are required");
      return;
    }

    for (const line of visibleLines) {
      if (!line.name.trim()) {
        toast.error("Every value needs a name");
        setSelectedKey(line.key);
        return;
      }
    }

    setSaving(true);
    try {
      if (attrDirty) {
        await updateAttribute(id, {
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || null,
          displayType,
          isActive,
        });
      }

      for (const line of lines) {
        if (line.removed && line.id) {
          await deleteAttributeValue(line.id);
        }
      }

      for (const line of lines) {
        if (!line.dirty || line.removed) continue;
        const payload = {
          attributeId: id,
          code:
            line.code.trim() ||
            slugCode(line.name) ||
            `VAL_${Date.now().toString(36).toUpperCase()}`,
          name: line.name.trim(),
          colorHex: showColor ? line.colorHex.trim() || null : null,
          sequence: parseInt(line.sequence, 10) || 10,
          isActive: line.isActive,
        };
        if (line.id) {
          await updateAttributeValue(line.id, payload);
        } else {
          await createAttributeValue(payload);
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
      title={name || "Attribute"}
      subtitle="Attribute"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Attributes", href: "/settings/attributes" },
        { label: name || "Attribute" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/settings/attributes">Back</Link>
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
                    <AlertDialogTitle>Delete attribute?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes {name || "this attribute"} and all
                      of its values.
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
      <PermissionGate permission="attributes.read" showDenied>
        {loading ? (
          <PageLoading />
        ) : (
          <div className="mx-auto max-w-5xl overflow-hidden rounded border border-[var(--erp-border)] bg-[var(--erp-surface)]">
            <div className="grid gap-3 border-b border-[var(--erp-border)] px-5 py-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center">
              <Label className="text-sm font-normal text-[var(--erp-text)]">
                Attribute
              </Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={name}
                  disabled={!canWrite}
                  onChange={(e) => {
                    setName(e.target.value);
                    setAttrDirty(true);
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
                      setAttrDirty(true);
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
                  setAttrDirty(true);
                }}
                className="h-9 max-w-xs font-mono uppercase"
              />
              <Label className="text-sm font-normal text-[var(--erp-text-muted)]">
                Display type
              </Label>
              <select
                disabled={!canWrite}
                className="flex h-9 max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
                value={displayType}
                onChange={(e) => {
                  setDisplayType(e.target.value);
                  setAttrDirty(true);
                }}
              >
                <option value="select">Select</option>
                <option value="radio">Radio</option>
                <option value="color">Color</option>
              </select>
              <Label className="text-sm font-normal text-[var(--erp-text-muted)]">
                Description
              </Label>
              <Input
                value={description}
                disabled={!canWrite}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setAttrDirty(true);
                }}
                className="h-9 max-w-md"
                placeholder="Optional"
              />
            </div>

            <div className="border-b border-[var(--erp-border)] bg-[var(--erp-section-head)] px-5">
              <div className="inline-flex border-b-2 border-[var(--erp-accent)] px-1 py-2.5 text-sm font-medium text-[var(--erp-text)]">
                Attribute Values
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--erp-border)] text-left text-xs font-semibold text-[var(--erp-text)]">
                    <th className="px-4 py-2.5 font-semibold">Value</th>
                    <th className="px-3 py-2.5 font-semibold">Code</th>
                    {showColor ? (
                      <th className="px-3 py-2.5 font-semibold">Color</th>
                    ) : null}
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Sequence
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold">
                      Active
                    </th>
                    {canWrite ? <th className="w-10 px-2 py-2.5" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibleLines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          (canWrite ? 5 : 4) + (showColor ? 1 : 0)
                        }
                        className="px-4 py-8 text-center text-sm text-[var(--erp-text-muted)]"
                      >
                        No values yet. Add lines like XL, 2XL, Red…
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
                              "bg-[var(--erp-accent)]/[0.04] outline outline-1 outline-[var(--erp-accent)] -outline-offset-1"
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
                                if (
                                  !line.id &&
                                  (!line.code ||
                                    line.code === slugCode(line.name))
                                ) {
                                  patch.code = slugCode(nextName);
                                }
                                patchLine(line.key, patch);
                              }}
                              className="h-8 border-transparent bg-transparent px-1 shadow-none focus-visible:border-input focus-visible:bg-[var(--erp-surface)]"
                              placeholder="e.g. 2XL"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              value={line.code}
                              disabled={!canWrite}
                              onChange={(e) =>
                                patchLine(line.key, {
                                  code: e.target.value.toUpperCase(),
                                })
                              }
                              className="h-8 border-transparent bg-transparent px-1 font-mono text-xs uppercase shadow-none focus-visible:border-input focus-visible:bg-[var(--erp-surface)]"
                              placeholder="2XL"
                            />
                          </td>
                          {showColor ? (
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  disabled={!canWrite}
                                  value={
                                    /^#[0-9A-Fa-f]{6}$/.test(line.colorHex)
                                      ? line.colorHex
                                      : "#CCCCCC"
                                  }
                                  onChange={(e) =>
                                    patchLine(line.key, {
                                      colorHex: e.target.value.toUpperCase(),
                                    })
                                  }
                                  className="size-7 cursor-pointer rounded border border-[var(--erp-border)] bg-transparent p-0"
                                />
                                <Input
                                  value={line.colorHex}
                                  disabled={!canWrite}
                                  onChange={(e) =>
                                    patchLine(line.key, {
                                      colorHex: e.target.value.toUpperCase(),
                                    })
                                  }
                                  className="h-8 border-transparent bg-transparent px-1 font-mono text-xs shadow-none focus-visible:border-input focus-visible:bg-[var(--erp-surface)]"
                                  placeholder="#FF0000"
                                />
                              </div>
                            </td>
                          ) : null}
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              value={line.sequence}
                              disabled={!canWrite}
                              onChange={(e) =>
                                patchLine(line.key, {
                                  sequence: e.target.value,
                                })
                              }
                              className="h-8 border-transparent bg-transparent px-1 text-right font-mono tabular-nums shadow-none focus-visible:border-input focus-visible:bg-[var(--erp-surface)]"
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
                                aria-label={`Remove ${line.name || "value"}`}
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

function valueToDraft(v: ProductAttributeValue): DraftLine {
  return {
    key: v.id,
    id: v.id,
    name: v.name,
    code: v.code,
    colorHex: v.colorHex ?? "",
    sequence: String(v.sequence ?? 10),
    isActive: v.isActive ?? true,
    dirty: false,
  };
}

function sortValues(list: ProductAttributeValue[]): ProductAttributeValue[] {
  return [...list].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || a.name.localeCompare(b.name)
  );
}

function slugCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}
