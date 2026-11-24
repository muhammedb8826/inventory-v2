"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import {
  FrappeButtonPrimary,
  FrappeDocument,
  FrappeField,
  FrappeFormGrid,
  FrappeSection,
} from "@/components/frappe";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchSelect } from "@/components/shared/search-select";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchTaxSettings, updateTaxSettings } from "@/lib/tax-settings";
import { TAX_MODE_OPTIONS } from "@/lib/form-select-options";
import { isForbiddenError } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { TaxMode, TaxSettings } from "@/lib/types";
import { toast } from "sonner";

export default function TaxSettingsPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, "settings.write");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [defaultPercent, setDefaultPercent] = useState("0");
  const [defaultMode, setDefaultMode] = useState<TaxMode>("EXCLUSIVE");
  const [applyToSales, setApplyToSales] = useState(true);
  const [applyToPurchases, setApplyToPurchases] = useState(true);

  function applySettings(data: TaxSettings) {
    setEnabled(data.enabled);
    setDefaultPercent(String(data.defaultPercent));
    setDefaultMode(data.defaultMode);
    setApplyToSales(data.applyToSales);
    setApplyToPurchases(data.applyToPurchases);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchTaxSettings();
        if (!cancelled) applySettings(data);
      } catch (err) {
        if (!cancelled && !isForbiddenError(err)) {
          toast.error(errorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    const pct = parseFloat(defaultPercent);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Default percent must be between 0 and 100");
      return;
    }
    setSaving(true);
    try {
      const data = await updateTaxSettings({
        enabled,
        defaultPercent: pct,
        defaultMode,
        applyToSales,
        applyToPurchases,
      });
      applySettings(data);
      toast.success("Tax settings saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Tax"
      subtitle="Company plan for sales and purchase tax"
      breadcrumbs={[
        { label: "Home", href: "/dashboard" },
        { label: "Tax" },
      ]}
    >
      <PermissionGate
        permissions={["settings.read", "settings.write"]}
        showDenied
      >
        {loading ? (
          <PageLoading />
        ) : (
          <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-4">
            <FrappeDocument>
              <FrappeSection
                title="Plan"
                description="Applied automatically on sales and purchases. Overriding rate or mode on a document requires sales.tax or purchase.tax."
              >
                <FrappeFormGrid columns={2}>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Switch
                      id="tax-enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                      disabled={!canWrite}
                    />
                    <Label htmlFor="tax-enabled">Enable tax</Label>
                  </div>
                  <FrappeField
                    label="Default mode"
                    hint="Exclusive adds tax on top; inclusive extracts tax from prices"
                  >
                    <SearchSelect
                      value={defaultMode}
                      onValueChange={(v) => setDefaultMode(v as TaxMode)}
                      options={TAX_MODE_OPTIONS}
                      searchPlaceholder="Search mode…"
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField label="Default %">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={defaultPercent}
                      onChange={(e) => setDefaultPercent(e.target.value)}
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="tax-sales"
                      checked={applyToSales}
                      onCheckedChange={setApplyToSales}
                      disabled={!canWrite || !enabled}
                    />
                    <Label htmlFor="tax-sales">Apply to sales</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="tax-purchases"
                      checked={applyToPurchases}
                      onCheckedChange={setApplyToPurchases}
                      disabled={!canWrite || !enabled}
                    />
                    <Label htmlFor="tax-purchases">Apply to purchases</Label>
                  </div>
                </FrappeFormGrid>
              </FrappeSection>
            </FrappeDocument>

            {canWrite ? (
              <div className="flex justify-end">
                <FrappeButtonPrimary type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save tax plan"}
                </FrappeButtonPrimary>
              </div>
            ) : null}
          </form>
        )}
      </PermissionGate>
    </AppShell>
  );
}
