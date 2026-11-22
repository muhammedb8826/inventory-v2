"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import { mobilePrimaryNav, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

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

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const tabs = filterNav(mobilePrimaryNav, user);

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--erp-border)] bg-[var(--erp-surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-[var(--erp-surface)]/90 md:hidden"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex min-w-0 flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                  active
                    ? "text-[var(--qenenia-orange)]"
                    : "text-[var(--erp-text-muted)] hover:text-[var(--qenenia-navy)]"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    active && "text-[var(--qenenia-orange)]"
                  )}
                  aria-hidden
                />
                <span className="truncate">{item.title}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-[var(--erp-text-muted)] transition-colors hover:text-[var(--qenenia-navy)]"
          >
            <Menu className="size-5 shrink-0" aria-hidden />
            <span className="truncate">More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
