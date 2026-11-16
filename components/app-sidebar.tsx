"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/user-menu";
import { VendorPoweredBy } from "@/components/vendor/vendor-help";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import { adminNav, mainNav, masterNav, type NavItem } from "@/lib/navigation";
import { BrandLogo } from "@/components/branding/brand-logo";
import { useBranding } from "@/components/branding/branding-provider";

function filterNav(
  items: NavItem[],
  user: ReturnType<typeof useAuth>["user"]
) {
  return items.filter((item) => {
    if (item.permission) return hasPermission(user, item.permission);
    if (item.permissions) return hasAnyPermission(user, item.permissions);
    return true;
  });
}

function NavItems({
  items,
  user,
}: {
  items: NavItem[];
  user: ReturnType<typeof useAuth>["user"];
}) {
  const pathname = usePathname();
  const visible = filterNav(items, user);

  if (visible.length === 0) return null;

  return (
    <SidebarMenu>
      {visible.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={item.title}
              className={
                active
                  ? "data-active:bg-[var(--sidebar-accent)] data-active:text-white [&_svg]:text-[var(--qenenia-orange)]"
                  : "text-sidebar-foreground/85 hover:text-white"
              }
            >
              <Link href={item.href}>
                <Icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { appName } = useBranding();
  const adminVisible = filterNav(adminNav, user);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/60 p-3">
        <Link
          href="/dashboard"
          aria-label={appName}
          className="flex items-center rounded-xl bg-white px-2.5 py-2 shadow-sm"
        >
          <BrandLogo
            className="w-full"
            imgClassName="h-10 w-auto max-w-full"
            priority
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavItems items={mainNav} user={user} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Master data</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavItems items={masterNav} user={user} />
          </SidebarGroupContent>
        </SidebarGroup>
        {adminVisible.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems items={adminNav} user={user} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter className="gap-2">
        {user ? <UserMenu /> : null}
        <VendorPoweredBy className="px-2 pb-1" />
      </SidebarFooter>
    </Sidebar>
  );
}
