"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { errorMessage } from "@/lib/format";
import { createUomCategory } from "@/lib/uom";
import { toast } from "sonner";

export default function NewUomCategoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = hasPermission(user, "uom.write");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasConstantWidth, setHasConstantWidth] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    if (!code.trim() || !name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setSaving(true);
    try {
      const cat = await createUomCategory({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        hasConstantWidth,
      });
      toast.success("Category created");
      router.replace(`/settings/uom/${cat.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="New"
      subtitle="Unit of Measure Category"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Units of measure", href: "/settings/uom" },
        { label: "New" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/settings/uom">Discard</Link>
          </Button>
          {canWrite ? (
            <Button
              type="submit"
              size="sm"
              form="uom-category-new"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </div>
      }
    >
      <PermissionGate permission="uom.write" showDenied>
        <form
          id="uom-category-new"
          onSubmit={handleSave}
          className="mx-auto max-w-3xl overflow-hidden rounded border border-[var(--erp-border)] bg-[var(--erp-surface)]"
        >
          <div className="grid gap-4 border-b border-[var(--erp-border)] px-5 py-5 sm:grid-cols-[200px_1fr] sm:items-center">
            <Label className="text-sm font-normal text-[var(--erp-text)]">
              Unit of Measure Category
            </Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!code || code === slugCode(name)) {
                  setCode(slugCode(e.target.value));
                }
              }}
              placeholder="e.g. Unit"
              className="h-9 max-w-md text-base"
              required
              autoFocus
            />
          </div>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-[200px_1fr]">
            <Label className="pt-2 text-sm font-normal text-[var(--erp-text-muted)]">
              Code
            </Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="UNIT"
              className="h-9 max-w-xs font-mono uppercase"
              required
            />
            <Label className="pt-2 text-sm font-normal text-[var(--erp-text-muted)]">
              Description
            </Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="max-w-md"
            />
            <Label className="pt-2 text-sm font-normal text-[var(--erp-text-muted)]">
              Has constant width
            </Label>
            <div className="flex max-w-md items-start gap-3">
              <Switch
                checked={hasConstantWidth}
                onCheckedChange={setHasConstantWidth}
              />
              <p className="text-xs text-[var(--erp-text-muted)]">
                Enable for fabric/roll categories. Items can set a constant
                width; documents may show cut width/height. Off = never show
                width or height.
              </p>
            </div>
          </div>
          <div className="border-t border-[var(--erp-border)] bg-[var(--erp-section-head)]/40 px-5 py-3 text-xs text-[var(--erp-text-muted)]">
            After save you can add units on the category form.
          </div>
        </form>
      </PermissionGate>
    </AppShell>
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
