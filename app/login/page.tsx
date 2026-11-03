"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AuthLoading } from "@/components/auth-loading";
import { useIsClient } from "@/hooks/use-is-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  VendorHelpSheet,
  VendorPoweredBy,
} from "@/components/vendor/vendor-help";
import { useBranding } from "@/components/branding/branding-provider";
import { Package2 } from "lucide-react";
import { errorMessage } from "@/lib/format";

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const { appName } = useBranding();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = useIsClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const loginMessage =
    searchParams.get("message") === "password-changed"
      ? "Password updated. Sign in with your new password."
      : null;

  useEffect(() => {
    if (!isClient || authLoading) return;
    if (user) {
      router.replace(redirectTo);
    }
  }, [isClient, authLoading, user, router, redirectTo]);

  if (!isClient || authLoading || user) {
    return <AuthLoading />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-[var(--erp-desk)] p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.08_230_/_0.18),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.4_0.06_230_/_0.25),transparent_55%)]" />
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
        <VendorHelpSheet />
        <ThemeToggle />
      </div>
      <div className="relative z-10 mb-8 flex items-center gap-2.5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--erp-accent)] text-white shadow-sm">
          <Package2 className="size-5" />
        </div>
        <span className="font-heading text-xl font-semibold tracking-tight text-[var(--erp-text)]">
          {appName}
        </span>
      </div>
      <Card className="relative z-10 w-full max-w-md border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-lg">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-xl text-[var(--erp-text)]">Sign in</CardTitle>
          <CardDescription className="text-[var(--erp-text-muted)]">
            Enter your work email and password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            {loginMessage ? (
              <p className="text-sm text-muted-foreground">{loginMessage}</p>
            ) : null}
            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-10 w-full bg-[var(--erp-accent)] text-white hover:bg-[var(--erp-accent-hover)]"
            >
              {loading ? <Spinner className="size-4" /> : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="relative z-10 mt-8 text-center">
        <VendorPoweredBy />
      </div>
    </div>
  );
}
