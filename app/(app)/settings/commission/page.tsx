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
import {
  fetchCommissionSettings,
  updateCommissionSettings,
} from "@/lib/commission-settings";
import { COMMISSION_BASIS_OPTIONS } from "@/lib/form-select-options";
import { isForbiddenError } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { CommissionBasis, CommissionSettings } from "@/lib/types";
import { toast } from "sonner";

export default function CommissionSettingsPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, "settings.write");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [defaultPercent, setDefaultPercent] = useState("10");
  const [defaultBasis, setDefaultBasis] =
    useState<CommissionBasis>("PROFIT");

  function applySettings(data: CommissionSettings) {
    setEnabled(data.enabled);
    setDefaultPercent(String(data.defaultPercent));
    setDefaultBasis(data.defaultBasis);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchCommissionSettings();
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
      const data = await updateCommissionSettings({
        enabled,
        defaultPercent: pct,
        defaultBasis,
      });
      applySettings(data);
      toast.success("Commission settings saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Commission"
      subtitle="Company plan for sales commission rate and basis"
      breadcrumbs={[
        { label: "Home", href: "/dashboard" },
        { label: "Commission" },
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
                description="Applied automatically on every sale. Overriding rate or basis on a sale requires the sales.commission permission."
              >
                <FrappeFormGrid columns={2}>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Switch
                      id="commission-enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                      disabled={!canWrite}
                    />
                    <Label htmlFor="commission-enabled">
                      Enable commissions
                    </Label>
                  </div>
                  <FrappeField
                    label="Default basis"
                    hint="Profit = margin; Sales = subtotal"
                  >
                    <SearchSelect
                      value={defaultBasis}
                      onValueChange={(v) =>
                        setDefaultBasis(v as CommissionBasis)
                      }
                      options={COMMISSION_BASIS_OPTIONS}
                      searchPlaceholder="Search basis…"
                      disabled={!canWrite}
                    />
                  </FrappeField>
                  <FrappeField
                    label="Default %"
                    hint={
                      defaultBasis === "SALES"
                        ? "Of sale subtotal"
                        : "Of gross profit"
                    }
                  >
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
                </FrappeFormGrid>
              </FrappeSection>
            </FrappeDocument>

            {canWrite ? (
              <div className="flex justify-end">
                <FrappeButtonPrimary type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save commission plan"}
                </FrappeButtonPrimary>
              </div>
            ) : null}
          </form>
        )}
      </PermissionGate>
    </AppShell>
  );
}
