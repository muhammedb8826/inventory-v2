"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ListRowActionItem = {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
};

export function ListRowActions({
  items,
  align = "end",
  className,
  label = "Row actions",
}: {
  items: ListRowActionItem[];
  align?: "start" | "center" | "end";
  className?: string;
  label?: string;
}) {
  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;

  return (
    <div
      className={cn("inline-flex", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]"
            aria-label={label}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="min-w-40">
          {visible.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                {Icon ? <Icon className="size-4" /> : null}
                <span>{item.label}</span>
              </>
            );

            if (item.href) {
              return (
                <DropdownMenuItem
                  key={item.label}
                  asChild
                  disabled={item.disabled}
                  variant={item.destructive ? "destructive" : "default"}
                >
                  <Link href={item.href}>{content}</Link>
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem
                key={item.label}
                disabled={item.disabled}
                variant={item.destructive ? "destructive" : "default"}
                onSelect={() => item.onSelect?.()}
              >
                {content}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
