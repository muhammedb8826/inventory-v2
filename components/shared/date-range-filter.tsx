"use client";

import { Input } from "@/components/ui/input";
import { FilterField, filterControlClass } from "@/components/shared/filter-field";
import { cn } from "@/lib/utils";

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  className,
  disabled,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <>
      <FilterField
        label="From"
        htmlFor="date-from"
        className={className}
      >
        <Input
          id="date-from"
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          disabled={disabled}
          className={cn(filterControlClass)}
        />
      </FilterField>
      <FilterField label="To" htmlFor="date-to" className={className}>
        <Input
          id="date-to"
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          disabled={disabled}
          className={cn(filterControlClass)}
        />
      </FilterField>
    </>
  );
}
