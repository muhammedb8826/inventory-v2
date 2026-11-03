"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBranding } from "@/components/branding/branding-provider";
import { VENDOR } from "@/lib/vendor";
import { cn } from "@/lib/utils";
import { MailIcon, PhoneIcon } from "lucide-react";

export function SiteHeader() {
  const pathname = usePathname();
  const { appName } = useBranding();
  const onHero = pathname === "/";

  return (
    <header
      className={cn(
        "z-20",
        onHero
          ? "absolute inset-x-0 top-0"
          : "sticky top-0 border-b border-[var(--site-line)] bg-[var(--site-surface)]/90 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className={cn(
            "site-display text-2xl font-semibold tracking-tight sm:text-3xl",
            onHero ? "text-white drop-shadow-sm" : "text-[var(--site-ink)]"
          )}
        >
          {appName}
        </Link>
        <nav
          className={cn(
            "flex items-center gap-4 text-sm sm:gap-5",
            onHero ? "text-white/90" : "text-[var(--site-ink-soft)]"
          )}
        >
          <a
            href="#help"
            className={cn(
              "font-medium transition-opacity hover:opacity-100",
              onHero ? "opacity-90" : "hover:text-[var(--site-ink)]"
            )}
          >
            Help
          </a>
          <a
            href={onHero ? "#inquire" : "/#inquire"}
            className={cn(
              "hidden font-medium transition-opacity hover:opacity-100 sm:inline",
              onHero ? "opacity-90" : "hover:text-[var(--site-ink)]"
            )}
          >
            Request a quote
          </a>
          <Link
            href="/login"
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              onHero
                ? "border border-white/35 bg-white/10 backdrop-blur-sm hover:bg-white/20"
                : "border border-[var(--site-line)] bg-[var(--site-paper)] text-[var(--site-ink)] hover:border-[var(--site-accent)]"
            )}
          >
            Staff sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { appName } = useBranding();

  return (
    <footer
      id="help"
      className="scroll-mt-8 border-t border-[var(--site-line)] bg-[var(--site-surface)]"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="site-display text-xl text-[var(--site-ink)]">
            {appName}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--site-ink-soft)]">
            Questions about products, availability, or custom quotes — we are
            here to help.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--site-ink-soft)] uppercase">
            Help &amp; contact
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {VENDOR.phones.map((phone) => (
              <li key={phone.tel}>
                <a
                  href={`tel:${phone.tel}`}
                  className="inline-flex items-center gap-2 text-[var(--site-ink)] transition-colors hover:text-[var(--site-accent)]"
                >
                  <PhoneIcon className="size-3.5 text-[var(--site-ink-soft)]" />
                  <span className="tabular-nums">{phone.display}</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${VENDOR.email}`}
                className="inline-flex items-center gap-2 break-all text-[var(--site-ink)] transition-colors hover:text-[var(--site-accent)]"
              >
                <MailIcon className="size-3.5 shrink-0 text-[var(--site-ink-soft)]" />
                {VENDOR.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--site-ink-soft)] uppercase">
            Platform
          </p>
          <p className="mt-4 text-sm text-[var(--site-ink-soft)]">
            Powered by{" "}
            <a
              href={VENDOR.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--site-accent)] underline-offset-4 hover:underline"
            >
              {VENDOR.name}
            </a>
          </p>
          <a
            href={VENDOR.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-[var(--site-ink)] underline-offset-4 hover:text-[var(--site-accent)] hover:underline"
          >
            {VENDOR.websiteLabel}
          </a>
          <div className="mt-6">
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--site-accent)] underline-offset-4 hover:underline"
            >
              Staff sign in
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--site-line)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4 text-xs text-[var(--site-ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>
            © {new Date().getFullYear()} {appName}
          </span>
          <span>
            Built with care by{" "}
            <a
              href={VENDOR.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {VENDOR.websiteLabel}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
