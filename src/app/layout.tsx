// app/layout.tsx
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import Providers from "./providers";
import Header from "@/app/components/Header";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

function getBaseUrl() {
  // 1) Explicit production URL (set in Vercel env vars → always resolves to prod domain)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl;

  // 2) Legacy explicit env
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl;

  // 3) Vercel provides this automatically — but it resolves to the preview domain
  //    on preview deployments, so prefer NEXT_PUBLIC_SITE_URL above for canonical URLs
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  // 4) Local dev fallback
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
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <Header />
          {children}
        </Providers>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
