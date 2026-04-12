import { Resend } from "resend";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function appUrl() {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL;

  if (explicit) return normalizeBaseUrl(explicit);

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${normalizeBaseUrl(vercelUrl)}`;

  return "http://localhost:3000";
}

export function fromEmail() {
  return process.env.RESEND_FROM ?? "Parchment <no-reply@omersiddiqui.com>";
}

export function getResend() {
  const key = process.env.RESEND_API_KEY;

  // In CI / PR builds -- don't throw at import time
  if (!key) return null;

  return new Resend(key);
}
