"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { errorMessage } from "@/lib/format";
import { createAttribute } from "@/lib/attributes";
import { toast } from "sonner";

export default function NewAttributePage() {
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = hasPermission(user, "attributes.write");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [displayType, setDisplayType] = useState("select");
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
      const attr = await createAttribute({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        displayType,
      });
      toast.success("Attribute created");
      router.replace(`/settings/attributes/${attr.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="New"
      subtitle="Attribute"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Attributes", href: "/settings/attributes" },
        { label: "New" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/settings/attributes">Discard</Link>
          </Button>
          {canWrite ? (
            <Button
              type="submit"
              size="sm"
              form="attribute-new"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </div>
      }
    >
      <PermissionGate permission="attributes.write" showDenied>
        <form
          id="attribute-new"
          onSubmit={handleSave}
          className="mx-auto max-w-3xl overflow-hidden rounded border border-[var(--erp-border)] bg-[var(--erp-surface)]"
        >
          <div className="grid gap-4 border-b border-[var(--erp-border)] px-5 py-5 sm:grid-cols-[200px_1fr] sm:items-center">
            <Label className="text-sm font-normal text-[var(--erp-text)]">
              Attribute
            </Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!code || code === slugCode(name)) {
                  setCode(slugCode(e.target.value));
                }
              }}
              placeholder="e.g. Size"
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
              placeholder="SIZE"
              className="h-9 max-w-xs font-mono uppercase"
              required
            />
            <Label className="pt-2 text-sm font-normal text-[var(--erp-text-muted)]">
              Display type
            </Label>
            <select
              className="flex h-9 max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
              value={displayType}
              onChange={(e) => setDisplayType(e.target.value)}
            >
              <option value="select">Select</option>
              <option value="radio">Radio</option>
              <option value="color">Color</option>
            </select>
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
          </div>
          <div className="border-t border-[var(--erp-border)] bg-[var(--erp-section-head)]/40 px-5 py-3 text-xs text-[var(--erp-text-muted)]">
            After save you can add values (XL, 2XL, Red…).
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
