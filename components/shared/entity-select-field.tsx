"use client";

import Link from "next/link";
import * as React from "react";
import { FrappeField } from "@/components/frappe";
import { SearchSelect } from "@/components/shared/search-select";
import { withSelectCreateTrigger } from "@/components/shared/create-in-select";

export interface EntityOption {
  id: string;
  label: string;
}

export function EntitySelectField({
  label,
  required,
  fullWidth,
  hint,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  listHref,
  listLabel,
  quickCreate,
  createLabel,
  emptyMessage,
  disabled,
  loading,
  filterLocally = true,
  onQueryChange,
}: {
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  hint?: string;
  value: string;
  onValueChange: (id: string) => void;
  options: EntityOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Optional “View all” link inside the dropdown footer. */
  listHref?: string;
  listLabel?: string;
  /**
   * Quick*Dialog (or render fn). Rendered inside the dropdown as
   * “Create new …”, not beside the field.
   */
  quickCreate?:
    | React.ReactElement<{ trigger?: React.ReactNode; disabled?: boolean }>
    | ((close: () => void) => React.ReactNode);
  /** Override default “Create new {label}”. */
  createLabel?: string;
  emptyMessage: string;
  disabled?: boolean;
  /** @deprecated No longer used — create lives in the dropdown. */
  stackedActions?: boolean;
  loading?: boolean;
  filterLocally?: boolean;
  onQueryChange?: (query: string) => void;
}) {
  const hasOptions = options.length > 0;
  const canCreate = Boolean(quickCreate);
  const emptyHint =
    hint ??
    (hasOptions
      ? undefined
      : canCreate
        ? `No ${label.toLowerCase()} yet — open the list and create one.`
        : `No ${label.toLowerCase()} yet — create one or open the list.`);

  const footer =
    canCreate || listHref
      ? (close: () => void) => (
          <div className="flex flex-col gap-0.5">
            {canCreate
              ? typeof quickCreate === "function"
                ? quickCreate(close)
                : withSelectCreateTrigger(
                    quickCreate!,
                    close,
                    createLabel ?? `Create new ${label.toLowerCase()}`
                  )
              : null}
            {listHref ? (
              <Link
                href={listHref}
                onClick={close}
                className="px-1 py-1 text-xs text-[var(--frappe-text-muted)] hover:text-[var(--frappe-primary)] hover:underline"
              >
                {listLabel ?? `View all ${label.toLowerCase()}s`}
              </Link>
            ) : null}
          </div>
        )
      : undefined;

  return (
    <FrappeField
      label={label}
      required={required}
      fullWidth={fullWidth}
      hint={emptyHint}
    >
      <SearchSelect
        value={value}
        onValueChange={onValueChange}
        options={options.map((option) => ({
          value: option.id,
          label: option.label,
        }))}
        placeholder={
          hasOptions
            ? (placeholder ?? `Select ${label.toLowerCase()}`)
            : `No ${label.toLowerCase()}s`
        }
        searchPlaceholder={
          searchPlaceholder ?? `Search ${label.toLowerCase()}…`
        }
        emptyMessage={emptyMessage}
        disabled={disabled || (!hasOptions && !loading && !canCreate)}
        loading={loading}
        filterLocally={filterLocally}
        onQueryChange={onQueryChange}
        footer={footer}
      />
      {!hasOptions && !loading ? (
        <div className="mt-2 rounded border border-dashed border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-3 py-2 text-xs text-[var(--frappe-text-muted)]">
          {emptyMessage}
        </div>
      ) : null}
    </FrappeField>
  );
}
