"use client";

import { AppShell } from "@/components/app-shell";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { PermissionGate } from "@/components/permission-gate";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" layout="default">
      <PermissionGate
        permission="dashboard.read"
        fallback={
          <p className="text-muted-foreground">
            You do not have permission to view the dashboard.
          </p>
        }
      >
        <DashboardOverview />
      </PermissionGate>
    </AppShell>
  );
}
