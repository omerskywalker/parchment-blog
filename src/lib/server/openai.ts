import OpenAI from "openai";

/**
 * Pre-configured OpenAI client.
 *
 * Supports two credential sources, in order of precedence:
 *   1. Replit AI Integrations proxy
 *      (AI_INTEGRATIONS_OPENAI_BASE_URL + AI_INTEGRATIONS_OPENAI_API_KEY)
 *      — used in local Replit development; the API key is a dummy string
 *      and the base URL routes through Replit's proxy.
 *   2. Standard OpenAI direct (OPENAI_API_KEY) — used in production
 *      (Vercel) where the env var must be set on the project.
 *
 * Both env-var sources resolve to the same `openai` SDK instance, so
 * call-sites don't need to know which one is active.
 */
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined;
const apiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY ||
  "";

export const openai = new OpenAI({ baseURL, apiKey });

export function isOpenAIConfigured(): boolean {
  return Boolean(apiKey);
}
