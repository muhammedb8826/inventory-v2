import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function FrappeField({
  label,
  required,
  hint,
  children,
  className,
  fullWidth,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        "frappe-control grid gap-1.5",
        fullWidth && "md:col-span-2",
        className
      )}
    >
      <Label>
        {label}
        {required ? <span className="text-[var(--erp-danger)]"> *</span> : null}
      </Label>
      <div className="erp-field-control">
        {children}
      </div>
      {hint ? (
        <p className="text-[11px] text-[var(--frappe-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
