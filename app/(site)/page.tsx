"use client";

import Link from "next/link";
import { useBranding } from "@/components/branding/branding-provider";

export default function HomePage() {
  const { appName, heroImageSrc, headline, supportingText } = useBranding();

  return (
    <section className="relative flex min-h-svh items-end overflow-hidden">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImageSrc}
          alt={`${appName} showroom`}
          className="site-hero-media h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--site-ink) 35%, transparent) 0%, var(--site-hero-veil) 55%, color-mix(in oklab, var(--site-ink) 82%, transparent) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-32 sm:px-8 sm:pb-20">
        <p className="site-display site-animate-rise text-4xl font-semibold text-white sm:text-5xl md:text-6xl">
          {appName}
        </p>
        <div className="site-rule mt-4 h-px w-24 bg-white/70" />
        <h1 className="site-display site-animate-rise site-animate-rise-delay-1 mt-6 max-w-2xl text-3xl font-medium leading-tight text-white sm:text-4xl md:text-[2.75rem]">
          {headline}
        </h1>
        <p className="site-animate-rise site-animate-rise-delay-2 mt-4 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
          {supportingText}
        </p>
        <div className="site-animate-rise site-animate-rise-delay-3 mt-8 flex flex-wrap gap-3">
          <a
            href="#help"
            className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[var(--site-ink)] transition-colors hover:bg-white/90"
          >
            Contact us
          </a>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md border border-white/40 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            Staff sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
