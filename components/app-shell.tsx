"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-top-bar";
import { SiteHeader } from "@/components/site-header";
import {
  FrappePageBody,
  FrappePageHead,
  type FrappeBreadcrumb,
} from "@/components/frappe";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AppShell({
  title,
  subtitle,
  breadcrumbs,
  children,
  actions,
  variant = "list",
  layout = "frappe",
  className,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: FrappeBreadcrumb[];
  children: React.ReactNode;
  actions?: React.ReactNode;
  variant?: "list" | "form" | "plain";
  /** erp/frappe = shared ERP page chrome; default = compact dashboard header */
  layout?: "frappe" | "erp" | "default";
  className?: string;
}) {
  const useErpChrome = layout === "frappe" || layout === "erp";
  const resolvedBreadcrumbs =
    breadcrumbs ??
    ([
      { label: "Home", href: "/dashboard" },
      { label: title },
    ] satisfies FrappeBreadcrumb[]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <TooltipProvider>
        <AppSidebar variant="inset" />
        <SidebarInset className="flex min-w-0 flex-col bg-[var(--erp-desk)]">
          <AppTopBar />
          {useErpChrome ? (
            <div className="erp-page frappe-page flex min-h-0 min-w-0 flex-1 flex-col">
              {variant !== "plain" ? (
                <FrappePageHead
                  title={title}
                  subtitle={subtitle}
                  breadcrumbs={resolvedBreadcrumbs}
                  actions={actions}
                />
              ) : null}
              <FrappePageBody
                className={cn(variant === "form" && "pb-8", className)}
              >
                {children}
              </FrappePageBody>
            </div>
          ) : (
            <>
              {variant !== "plain" ? (
                <SiteHeader title={title} actions={actions} />
              ) : null}
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-4 overflow-auto p-3 sm:p-4 md:gap-6 md:p-6",
                  className
                )}
              >
                {children}
              </div>
            </>
          )}
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
