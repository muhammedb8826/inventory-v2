"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const controlClass =
  "h-9 w-full min-w-0 border-[var(--erp-border)] bg-[var(--erp-surface)]";

export function FilterField({
  label,
  htmlFor,
  children,
  className,
  wide,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  /** Prefer a wider slot (search / long selects) */
  wide?: boolean;
}) {
  return (
    <div className={cn("grid w-full min-w-0 gap-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium tracking-wide text-[var(--erp-text-muted)]"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onValueChange,
  placeholder,
  options,
  allLabel,
  allValue = "__all__",
  /** When true, selecting "all" keeps `allValue` instead of clearing to "". */
  keepAllValue = false,
  className,
  wide,
  disabled,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  allLabel?: string;
  allValue?: string;
  keepAllValue?: boolean;
  className?: string;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <FilterField label={label} className={className} wide={wide}>
      <Select
        value={value || allValue}
        onValueChange={(next) =>
          onValueChange(
            next === allValue ? (keepAllValue ? allValue : "") : next
          )
        }
        disabled={disabled}
      >
        <SelectTrigger className={controlClass}>
          <SelectValue placeholder={placeholder ?? allLabel ?? label} />
        </SelectTrigger>
        <SelectContent>
          {allLabel ? (
            <SelectItem value={allValue}>{allLabel}</SelectItem>
          ) : null}
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  );
}

export { controlClass as filterControlClass };
