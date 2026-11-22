"use client";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import { useIsClient } from "@/hooks/use-is-client";
import {
  BellIcon,
  EllipsisVerticalIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
} from "lucide-react";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    role?: string;
  };
}) {
  const { isMobile } = useSidebar();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();
  const themeValue = isClient ? (theme ?? "system") : "system";
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-white/15 text-sidebar-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/65">
                  {user.email}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4 text-sidebar-foreground/65" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-text)]"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-[var(--qenenia-navy)] text-white dark:bg-[var(--qenenia-orange)] dark:text-[var(--qenenia-navy-deep)]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-[var(--erp-text)]">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-[var(--erp-text-muted)]">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            {user.role ? (
              <>
                <DropdownMenuSeparator className="bg-[var(--erp-border)]" />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled
                    className="text-[var(--erp-text-muted)]"
                  >
                    <ShieldIcon />
                    {user.role}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            ) : null}
            <DropdownMenuSeparator className="bg-[var(--erp-border)]" />
            <DropdownMenuItem asChild>
              <Link href="/notifications">
                <BellIcon />
                Notifications
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account">
                <SettingsIcon />
                Account settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--erp-border)]" />
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-[var(--erp-text-muted)]">
              Appearance
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={themeValue}
              onValueChange={setTheme}
            >
              <DropdownMenuRadioItem value="light">
                <SunIcon />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <MoonIcon />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <MonitorIcon />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator className="bg-[var(--erp-border)]" />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
