"use client";

import { PrinterIcon } from "lucide-react";
import { FrappeButtonSecondary } from "@/components/frappe";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <FrappeButtonSecondary
      type="button"
      className="no-print"
      onClick={() => window.print()}
    >
      <PrinterIcon className="size-3.5" />
      {label}
    </FrappeButtonSecondary>
  );
}
