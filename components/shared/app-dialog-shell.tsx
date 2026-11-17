"use client";

import * as React from "react";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AppDialogSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AppDialogSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
};

/** Shared modal chrome — use for every app dialog. */
export function AppDialogContent({
  children,
  className,
  size = "md",
  /** Scroll the whole dialog (simple forms) vs flex column with sticky header/footer. */
  scroll = "body",
}: {
  children: React.ReactNode;
  className?: string;
  size?: AppDialogSize;
  scroll?: "body" | "dialog";
}) {
  return (
    <DialogContent
      className={cn(
        "flex w-full max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0",
        "rounded-xl border border-[var(--frappe-border)] bg-[var(--frappe-surface)] shadow-lg",
        scroll === "body"
          ? "max-h-[min(92vh,760px)]"
          : "max-h-[min(92vh,760px)] overflow-y-auto",
        SIZE_CLASS[size],
        className
      )}
    >
      {children}
    </DialogContent>
  );
}

export function AppDialogHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogHeader
      className={cn(
        "shrink-0 space-y-2 border-b border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-3.5 sm:px-5",
        className
      )}
    >
      <DialogTitle className="text-base font-semibold tracking-tight text-[var(--frappe-text)]">
        {title}
      </DialogTitle>
      {description ? (
        <p className="text-xs text-[var(--frappe-text-muted)]">{description}</p>
      ) : null}
      {children}
    </DialogHeader>
  );
}

export function AppDialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Footer actions: group on the end (right on desktop).
 * Pass `start` for destructive / secondary left-side actions — they stay
 * visually grouped with a gap, not `mr-auto` edge-stretched.
 */
export function AppDialogFooter({
  children,
  start,
  className,
}: {
  children: React.ReactNode;
  start?: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogFooter
      className={cn(
        "mx-0 mb-0 shrink-0 rounded-none border-t border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-3 sm:px-5",
        "flex flex-col-reverse gap-2 sm:flex-row sm:items-center",
        start ? "sm:justify-between" : "sm:justify-end",
        className
      )}
    >
      {start ? (
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
          {start}
        </div>
      ) : null}
      <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
        {children}
      </div>
    </DialogFooter>
  );
}
