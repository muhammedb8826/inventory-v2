"use client";

import { Input } from "@/components/ui/input";
import { FilterField, filterControlClass } from "@/components/shared/filter-field";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";

export function ListSearchField({
  id = "list-search",
  label = "Search",
  value,
  onChange,
  placeholder = "Search…",
  className,
  disabled,
  wide = true,
  /** toolbar = compact bar search (no label); field = labeled form control */
  variant = "field",
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  wide?: boolean;
  variant?: "field" | "toolbar";
}) {
  const input = (
    <div className={cn("relative w-full", className)}>
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--erp-text-muted)]" />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(filterControlClass, "pl-9")}
      />
    </div>
  );

  if (variant === "toolbar") {
    return input;
  }

  return (
    <FilterField label={label} htmlFor={id} wide={wide}>
      {input}
    </FilterField>
  );
}
