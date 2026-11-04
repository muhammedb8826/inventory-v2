"use client";

import { AuthProvider } from "@/lib/auth";
import { BrandingProvider } from "@/components/branding/branding-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { BrandingSettings } from "@/lib/types";

export function Providers({
  children,
  initialBranding,
}: {
  children: React.ReactNode;
  initialBranding?: BrandingSettings | null;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <BrandingProvider initialBranding={initialBranding}>
            {children}
            <Toaster richColors position="top-right" />
          </BrandingProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
