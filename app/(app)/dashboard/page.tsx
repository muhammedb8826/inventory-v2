"use client";

import { AppShell } from "@/components/app-shell";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { PermissionGate } from "@/components/permission-gate";

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Live KPIs, cash movement, and financial mix"
      layout="erp"
    >
      <PermissionGate permission="dashboard.read" showDenied>
        <DashboardOverview />
      </PermissionGate>
    </AppShell>
  );
}
