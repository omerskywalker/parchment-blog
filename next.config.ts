import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

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
    ],
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
