"use client";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { VendorHelpSheet } from "@/components/vendor/vendor-help";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/branding/brand-logo";
import { useBranding } from "@/components/branding/branding-provider";

export function AppTopBar() {
  const { appName } = useBranding();

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-[var(--erp-border)] bg-[var(--erp-surface)]/95 px-3 backdrop-blur supports-backdrop-filter:bg-[var(--erp-surface)]/90 sm:px-4 lg:px-5">
      <SidebarTrigger className="size-8 text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]" />
      <Separator
        orientation="vertical"
        className="mr-1 hidden h-5 sm:block data-[orientation=vertical]:h-5"
      />
      <BrandLogo
        className="min-w-0 inline-flex"
        imgClassName="h-7 w-auto max-w-[140px] sm:max-w-[160px]"
        alt={appName}
      />
      <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
        <VendorHelpSheet />
        <ThemeToggle variant="ghost" />
        <NotificationBell />
        <UserMenu compact />
      </div>
    </header>
  );
}
