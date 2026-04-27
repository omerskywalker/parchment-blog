// app/layout.tsx
import "./globals.css";
import { Geist, Geist_Mono, Playfair_Display, Lora } from "next/font/google";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Providers from "./providers";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { SWRegistration } from "@/app/components/SWRegistration";
import { getThemeBootScript } from "@/lib/theme";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

/**
 * Parchment-aesthetic fonts — used only when [data-theme="sepia"] is active
 * (see globals.css). Cormorant Garamond is a refined classical display serif;
 * Lora is a balanced book serif tuned for screen body text. Both are loaded
 * with display: swap so we never block render, and weights are scoped tight
 * to keep the payload small.
 */
const pbDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
  variable: "--font-pb-display",
});

const pbText = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-pb-text",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
         * Stamp <html data-theme="..."> BEFORE React hydrates so visitors
         * with a saved sepia preference never see a flash of dark theme.
         * Inline + synchronous on purpose. See src/lib/theme.ts for the
         * single source of truth.
         */}
        <script dangerouslySetInnerHTML={{ __html: getThemeBootScript() }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pbDisplay.variable} ${pbText.variable} flex min-h-screen flex-col`}
      >
        <Providers>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
        <SWRegistration />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
