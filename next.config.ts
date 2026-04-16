import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent browsers from MIME-sniffing the content type
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Deny framing entirely (clickjacking protection)
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Restrict referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Limit browser feature access
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // DNS prefetching — keep enabled for performance
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // HSTS — only activate in production (Vercel sets this anyway, but belt-and-suspenders)
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  // Content Security Policy
  // react-markdown renders into the DOM safely (no dangerouslySetInnerHTML by default)
  // However we do use dangerouslySetInnerHTML for JSON-LD — that content is server-generated
  // and not user-controlled at render time, so it's safe.
  //
  // CSP strategy:
  // - script-src: 'self' + Vercel Analytics + Sentry tunnel + unsafe-inline for Next.js
  //   inline scripts (hydration). 'unsafe-eval' needed for Next.js dev mode only.
  // - style-src: 'self' + 'unsafe-inline' (Tailwind v4 injects styles at runtime)
  // - img-src: 'self' + data URIs + AWS S3 for avatars + external images in posts
  // - connect-src: 'self' + Sentry + Vercel analytics ingest endpoints
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for hydration chunks; nonce-based CSP would be
      // the stricter approach but requires middleware rewrite — left as a future upgrade
      "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.amazonaws.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
      "font-src 'self'",
      "connect-src 'self' https://*.sentry.io https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Bundle OG font files with the opengraph-image route so they're available
  // at process.cwd()/src/app/fonts/ inside Vercel's serverless environment.
  // Without this, the src/ tree is absent in prod and fs.readFileSync fails.
  outputFileTracingIncludes: {
    "/posts/[slug]/opengraph-image": ["./src/app/fonts/*.otf"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "omer-siddiqui",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  automaticVercelMonitors: true,
  disableLogger: true,
});
