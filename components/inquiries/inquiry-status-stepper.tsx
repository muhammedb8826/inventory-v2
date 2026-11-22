"use client";

import {
  INQUIRY_PIPELINE_STATUSES,
  inquiryStatusLabel,
  inquiryStatusStepClickable,
} from "@/lib/inquiries";
import { cn } from "@/lib/utils";
import type { InquiryStatus } from "@/lib/types";

function pipelineIndex(status: InquiryStatus): number {
  if (status === "ORDERED") return 2;
  if (status === "QUOTED") return 1;
  if (status === "DRAFT") return 0;
  return -1;
}

/**
 * Odoo-style statusbar ribbon — click each stage to advance
 * (Ordered opens convert-to-sale, same as Confirm in Odoo).
 */
export function InquiryStatusStepper({
  status,
  onChange,
  canOrder = false,
  disabled,
  className,
}: {
  status: InquiryStatus;
  onChange?: (status: InquiryStatus) => void;
  /** When true, Quotation → Ordered is clickable (convert to sale). */
  canOrder?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const currentIdx = pipelineIndex(status);
  const isLost = status === "LOST";
  const isCancelled = status === "CANCELLED";
  const terminal = isLost || isCancelled;
  const clickOpts = { canOrder };

  function select(next: InquiryStatus) {
    if (disabled || !onChange) return;
    if (next === status) return;
    if (!inquiryStatusStepClickable(status, next, clickOpts)) return;
    onChange(next);
  }

  if (terminal) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <span
          className={cn(
            "inline-flex h-8 items-center rounded px-3 text-xs font-semibold",
            isLost
              ? "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
              : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          )}
        >
          {inquiryStatusLabel(status)}
        </span>
        {!disabled &&
        onChange &&
        isLost &&
        inquiryStatusStepClickable(status, "DRAFT", clickOpts) ? (
          <button
            type="button"
            onClick={() => select("DRAFT")}
            className="h-8 rounded px-2.5 text-xs font-medium text-[var(--frappe-primary)] hover:underline"
          >
            Reopen
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div
        role="list"
        aria-label="Quotation status"
        className="inline-flex items-stretch"
      >
        {INQUIRY_PIPELINE_STATUSES.map((step, index) => {
          const active = currentIdx === index;
          const clickable =
            !disabled &&
            Boolean(onChange) &&
            inquiryStatusStepClickable(status, step, clickOpts);
          const isFirst = index === 0;
          const isLast = index === INQUIRY_PIPELINE_STATUSES.length - 1;

          return (
            <button
              key={step}
              type="button"
              role="listitem"
              disabled={!clickable}
              onClick={() => select(step)}
              aria-current={active ? "step" : undefined}
              title={
                step === "ORDERED"
                  ? canOrder
                    ? "Convert to sales order"
                    : "Save as Quotation first, then convert"
                  : inquiryStatusLabel(step)
              }
              className={cn(
                "relative -ml-px h-8 min-w-[5.5rem] px-4 text-xs font-medium first:ml-0",
                active
                  ? "z-[1] bg-[color-mix(in_oklab,var(--erp-accent)_14%,var(--erp-surface))] text-[var(--erp-text)]"
                  : "bg-[var(--frappe-surface)] text-[var(--frappe-text-muted)]",
                clickable && "cursor-pointer hover:brightness-[0.98]",
                !clickable && "cursor-default",
                isFirst && !isLast && "rounded-l-md",
                isLast && "rounded-r-md",
                !isLast &&
                  "[clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%)]",
                !isFirst &&
                  !isLast &&
                  "[clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)] pl-5",
                !isFirst &&
                  isLast &&
                  "[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,10px_50%)] pl-5",
                "border border-[var(--frappe-border)]",
                active &&
                  "border-[color-mix(in_oklab,var(--erp-accent)_35%,var(--erp-border))]"
              )}
            >
              {inquiryStatusLabel(step)}
            </button>
          );
        })}
      </div>

      {!disabled &&
      onChange &&
      inquiryStatusStepClickable(status, "LOST", clickOpts) ? (
        <button
          type="button"
          onClick={() => select("LOST")}
          className="h-8 rounded px-2.5 text-xs font-medium text-[var(--frappe-text-muted)] hover:text-amber-800"
        >
          Mark Lost
        </button>
      ) : null}
    </div>
  );
}
