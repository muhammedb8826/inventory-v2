"use client";

import Link from "next/link";
import { useBranding } from "@/components/branding/branding-provider";
import { VENDOR } from "@/lib/vendor";
import { MailIcon, PhoneIcon } from "lucide-react";

export default function ContactPage() {
  const { appName } = useBranding();

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
      <div className="mb-10 max-w-xl">
        <p className="text-sm font-medium text-[var(--site-accent)]">
          <Link href="/" className="hover:underline">
            ← Back to {appName}
          </Link>
        </p>
        <h1 className="site-display mt-4 text-4xl font-semibold text-[var(--site-ink)] sm:text-5xl">
          Contact
        </h1>
        <p className="mt-3 text-[var(--site-ink-soft)] leading-relaxed">
          Reach us by phone or email. Staff create quotations inside the app
          after signing in.
        </p>
      </div>

      <div className="max-w-md space-y-4 text-sm">
        {VENDOR.phones.map((phone) => (
          <a
            key={phone.tel}
            href={`tel:${phone.tel}`}
            className="flex items-center gap-3 text-[var(--site-ink)] hover:text-[var(--site-accent)]"
          >
            <PhoneIcon className="size-4 text-[var(--site-ink-soft)]" />
            <span className="tabular-nums">{phone.display}</span>
          </a>
        ))}
        <a
          href={`mailto:${VENDOR.email}`}
          className="flex items-center gap-3 break-all text-[var(--site-ink)] hover:text-[var(--site-accent)]"
        >
          <MailIcon className="size-4 shrink-0 text-[var(--site-ink-soft)]" />
          {VENDOR.email}
        </a>
        <p className="pt-4 text-[var(--site-ink-soft)]">
          Staff members should{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--site-accent)] underline-offset-4 hover:underline"
          >
            sign in
          </Link>{" "}
          to create quotations.
        </p>
      </div>
    </div>
  );
}
