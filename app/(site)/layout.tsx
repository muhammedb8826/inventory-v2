import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { fetchPublicBrandingServer } from "@/lib/branding-server";
import "../site.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await fetchPublicBrandingServer();
  return {
    title: {
      default: branding.appName,
      template: `%s · ${branding.appName}`,
    },
    description:
      branding.supportingText ||
      "Ask about products, availability, and custom quotes. Our team will follow up shortly.",
  };
}

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`site site-grain ${fraunces.variable} ${outfit.variable}`}
    >
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
