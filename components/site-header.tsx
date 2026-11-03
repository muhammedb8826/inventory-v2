"use client";

export function SiteHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="shrink-0 border-b border-[var(--erp-border)] bg-[var(--erp-surface)]">
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5 lg:px-6">
        <h1 className="font-heading truncate text-lg font-semibold tracking-tight text-[var(--erp-text)] sm:text-xl">
          {title}
        </h1>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
