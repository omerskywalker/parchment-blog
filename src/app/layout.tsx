// app/layout.tsx
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Providers from "./providers";
import Header from "@/app/components/Header";
import { isV3Enabled } from "@/lib/flags";
import FooterV3 from "@/v3/components/FooterV3";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Parchment — Write Without Noise",
    template: "%s · Parchment",
  },
  description:
    "Parchment is a minimalist blogging platform for independent writers. No algorithmic feeds. No distractions. Just your words.",
  keywords: ["blog", "writing", "minimalist", "independent publishing"],
  openGraph: {
    type: "website",
    siteName: "Parchment",
    title: "Parchment — Write Without Noise",
    description:
      "A minimalist blogging platform for independent writers. No algorithmic feeds. Just your words.",
  },
  twitter: {
    card: "summary",
    title: "Parchment — Write Without Noise",
    description:
      "A minimalist blogging platform for independent writers. No algorithmic feeds. Just your words.",
  },
  alternates: {
    types: { "application/rss+xml": "/rss.xml" },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const v3 = await isV3Enabled();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable}${
          v3 ? " flex min-h-screen flex-col" : ""
        }`}
      >
        <Providers>
          <Header />
          {v3 ? <div className="flex-1">{children}</div> : children}
          {v3 && <FooterV3 />}
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
