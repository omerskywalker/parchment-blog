import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function fromEmail() {
  return process.env.RESEND_FROM ?? "Parchment <no-reply@example.com>";
}
