"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/lib/auth";
import { useIsClient } from "@/hooks/use-is-client";
import { cn } from "@/lib/utils";
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
} from "lucide-react";

export function UserMenu({
  compact = false,
}: {
  /** Icon-style trigger for the global top bar */
  compact?: boolean;
}) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();
  if (!user) return null;

  const name = user.fullName;
  const email = user.email;
  const role = user.role?.name;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const themeValue = isClient ? (theme ?? "system") : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button
            type="button"
            variant="ghost"
            className="h-9 gap-2 px-1.5 text-[var(--erp-text)] hover:bg-[var(--erp-section-head)] hover:text-[var(--erp-text)] sm:px-2"
            aria-label="Account menu"
          >
            <Avatar className="size-7 rounded-lg">
              <AvatarFallback className="rounded-lg bg-[var(--qenenia-navy)] text-xs text-white dark:bg-[var(--qenenia-orange)] dark:text-[var(--qenenia-navy-deep)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[9rem] truncate text-sm font-medium lg:inline">
              {name}
            </span>
            <ChevronsUpDownIcon className="hidden size-3.5 text-[var(--erp-text-muted)] sm:inline" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-auto w-full justify-start gap-2 px-2 py-1.5",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            )}
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-white/15 text-sidebar-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs text-sidebar-foreground/65">
                {email}
              </span>
            </div>
            <ChevronsUpDownIcon className="size-4 text-sidebar-foreground/65" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-text)]"
        align="end"
        side={compact ? "bottom" : "top"}
        sideOffset={6}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-[var(--qenenia-navy)] text-white dark:bg-[var(--qenenia-orange)] dark:text-[var(--qenenia-navy-deep)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-[var(--erp-text)]">
                {name}
              </span>
              <span className="truncate text-xs text-[var(--erp-text-muted)]">
                {email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        {role ? (
          <>
            <DropdownMenuSeparator className="bg-[var(--erp-border)]" />
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled
                className="text-[var(--erp-text-muted)]"
              >
                <ShieldIcon />
                {role}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator className="bg-[var(--erp-border)]" />
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
        <DropdownMenuRadioGroup value={themeValue} onValueChange={setTheme}>
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
  );
}
