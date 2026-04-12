// app/layout.tsx
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
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
  // 1) Prefer an explicit env you control
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit;

  // 2) Vercel provides this automatically in prod/preview
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  // 3) Local dev fallback
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

  icons: {
    icon: "/icon.jpg",
    apple: "/icon.jpg",
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
        <Analytics />
      </body>
    </html>
  );
}
