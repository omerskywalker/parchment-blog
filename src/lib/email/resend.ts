import { Resend } from "resend";

export function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
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
