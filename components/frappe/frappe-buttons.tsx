import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const frappePrimary =
  "h-9 rounded-md border-0 bg-[var(--erp-accent)] px-3.5 text-xs font-medium text-white shadow-none hover:bg-[var(--erp-accent-hover)] sm:h-8";

const frappeSecondary =
  "h-9 rounded-md border border-[var(--erp-border)] bg-[var(--erp-surface)] px-3.5 text-xs font-medium text-[var(--erp-text)] shadow-none hover:bg-[var(--erp-section-head)] sm:h-8";

export function FrappeButtonPrimary({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button className={cn(frappePrimary, className)} {...props} />;
}

export function FrappeButtonSecondary({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" className={cn(frappeSecondary, className)} {...props} />
  );
}

export function FrappeButtonLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button variant="outline" className={cn(frappeSecondary, className)} asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
